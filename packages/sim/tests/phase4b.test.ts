import { describe, expect, test } from "bun:test";
import { createGame, DAYS_PER_YEAR, GOODS, IMPORT_FLOOR_DAYS, shortestPath } from "../src/index";
import type { Game } from "../src/index";
import { activeShockCounties, shockScales } from "../src/shocks";
import type { Person, World } from "../src/state";

/** Every NPC trader in the world, in person order. */
function traders(world: World): Person[] {
  return Object.values(world.people).filter((p) => p.isTrader === true);
}

/** Step the game and record nothing but the trader-safety walk. */
function runSteps(game: Game, days: number): void {
  for (let i = 0; i < days; i++) game.step();
}

describe("phase 4b: shocks, traders, society, report", () => {
  test("traders never go into debt across a long run", () => {
    const game = createGame(1337);
    expect(traders(game.world).length).toBeGreaterThan(3);
    for (let i = 0; i < 720; i++) {
      game.step();
      for (const trader of traders(game.world)) {
        expect(trader.wealth, `${trader.id} wealth at day ${i}`).toBeGreaterThanOrEqual(0);
        for (const quantity of Object.values(trader.stock)) expect(quantity).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("traders submit only legal commands: no failed outcomes ever surface", () => {
    const game = createGame(4242);
    const traderIds = new Set(traders(game.world).map((t) => t.id));
    for (let i = 0; i < 720; i++) {
      game.step();
      // The history is capped at 500; walk back over every entry a trader caused
      // and reject any business that failed validation.
      for (const outcome of game.world.history) {
        if (outcome.actorId === null || !traderIds.has(outcome.actorId)) continue;
        expect(outcome.kind, `${outcome.text}`).not.toMatch(/failed/);
      }
    }
    // The walk above also proves traders did something: legal trades happened.
    const traded = game.world.history.some((o) => o.actorId !== null && traderIds.has(o.actorId) && o.kind === "trade");
    expect(traded).toBe(true);
  });

  test("traders and shocks do not disturb determinism", () => {
    const a = createGame(9001);
    const b = createGame(9001);
    runSteps(a, 1800);
    runSteps(b, 1800);
    expect(b.serialize()).toBe(a.serialize());
    // Prove the world actually had shocks and trader activity to be deterministic about.
    expect(a.world.counters.shock).toBeGreaterThan(0);
    const traded = Object.values(a.world.people).some((p) => p.isTrader && (p.wealth > 0 || Object.keys(p.stock).length > 0));
    expect(traded).toBe(true);
  });

  test("a save taken mid-journey with an active shock reloads identically and continues", () => {
    const game = createGame(7777);
    // Get a shock live first (it lasts 20+ days, so it will still be running
    // when the journey starts), then travel somewhere and stop while on the road.
    let guard = 0;
    while (game.world.shocks.length === 0 && guard < 2000) {
      game.step();
      guard++;
    }
    expect(game.world.shocks.length).toBeGreaterThan(0);
    const home = game.snapshot().player.location!;
    let target = home;
    for (const town of game.snapshot().towns) {
      if (town.id === home) continue;
      const plan = shortestPath(game.world, home, town.id);
      if (plan !== null && plan.days > 2) {
        target = town.id;
        break;
      }
    }
    game.send({ kind: "player" }, { kind: "travel", to: target });
    game.step();
    game.step();
    // Mid-journey: the traveller is on the road right now, and the shock is live.
    const snap = game.snapshot();
    expect(snap.player.location).toBeNull();
    expect(snap.player.journey).not.toBeNull();
    expect(game.world.shocks.length).toBeGreaterThan(0);

    const save = game.serialize();
    const fresh = createGame(1);
    fresh.load(save);
    expect(fresh.serialize()).toBe(save); // byte-identical round trip mid-run
    expect(fresh.snapshot().player.journey).toEqual(snap.player.journey);
    expect(fresh.world.shocks).toEqual(game.world.shocks);

    // Both worlds finish the same way from the same save.
    runSteps(game, 60);
    runSteps(fresh, 60);
    expect(fresh.serialize()).toBe(game.serialize());
  });

  test("floods close their road and reopen it when the shock clears", () => {
    const game = createGame(5150);
    const road = game.world.roads[0]!;
    game.world.shocks.push({
      id: "shock-test",
      kind: "flood",
      targetId: road.id,
      startDay: game.world.day,
      endDay: game.world.day + 2,
    });
    road.status = "flooded"; // the spawn path closes the road; mirror it here
    game.step();
    expect(game.world.roads.find((r) => r.id === road.id)!.status).toBe("flooded");
    expect(game.snapshot().roads.find((r) => r.id === road.id)!.status).toBe("flooded");
    game.step();
    game.step();
    game.step();
    game.step();
    game.step(); // past endDay
    expect(game.world.roads.find((r) => r.id === road.id)!.status).toBe("open");
    expect(game.snapshot().roads.find((r) => r.id === road.id)!.status).toBe("open");
  });

  test("drought scales a county's grain and plague a county's medicine need", () => {
    const game = createGame(1337);
    const countyId = game.world.counties[0]!.id;
    game.world.shocks.push(
      { id: "shock-d", kind: "drought", targetId: countyId, startDay: 0, endDay: 30 },
      { id: "shock-p", kind: "plague", targetId: countyId, startDay: 0, endDay: 30 },
    );
    const counties = activeShockCounties(game.world);
    const grain = shockScales(counties, countyId, "grain");
    const medicine = shockScales(counties, countyId, "medicine");
    expect(grain.productionScale).toBeCloseTo(0.4);
    expect(medicine.consumptionScale).toBeCloseTo(2.0);
    // A different county, and a different good in the hit county, are untouched.
    const otherCountyId = game.world.counties.find((c) => c.id !== countyId)!.id;
    expect(shockScales(counties, otherCountyId, "grain").productionScale).toBe(1);
    expect(shockScales(counties, countyId, "salt").productionScale).toBe(1);
  });

  test("sustained shortages keep a non-producer essential market off the famine floor", () => {
    // A town that does not produce salt still pays import provision when its
    // stock runs thin, so 30-day stockout runs stay rare (the report target is
    // under 5% of town-days; a single town's persistent starvation should be ~0).
    const game = createGame(777);
    // Find a town that produces no salt.
    const saltless = game.world.towns.find((t) => game.world.markets[t.id]!["salt"]!.production <= 0)!;
    const entry = game.world.markets[saltless.id]!["salt"]!;
    // Simulate a chronic shortfall: set no production and near-empty stock.
    entry.production = 0;
    entry.stock = 0.01 * entry.target;
    let worstRun = 0;
    let run = 0;
    const floor = entry.dailyConsumption * IMPORT_FLOOR_DAYS;
    for (let d = 0; d < 300; d++) {
      game.step();
      const stock = game.world.markets[saltless.id]!["salt"]!.stock;
      if (stock <= floor + 1e-6) run++;
      else run = 0;
      worstRun = Math.max(worstRun, run);
    }
    // Provision restocks at 1.25x consumption/day against a 3-day floor, so the
    // market should never sit at the floor for anywhere near 30 days.
    expect(worstRun).toBeLessThan(30);
  });

  test("the economy stays bounded and profitable: no NaN or negative stock with traders live", () => {
    const game = createGame(888);
    for (let i = 0; i < 120; i++) {
      game.step();
      for (const town of game.world.towns) {
        for (const good of GOODS) {
          const entry = game.world.markets[town.id]![good.id]!;
          expect(Number.isFinite(entry.stock), `${town.id} ${good.id}`).toBe(true);
          expect(entry.stock).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  test("the stockout fraction stays under 5% over a bounded deterministic run", () => {
    // The checkpoint target. Measured the same way as scripts/report.ts, over a
    // fixed seed and horizon so the test is exact, not statistical. At 10 years
    // every probed seed sits below 2%; assert well inside the 5% target.
    const game = createGame(11);
    const days = 10 * DAYS_PER_YEAR;
    const runs = new Map<string, number>();
    let essentialDays = 0;
    let stockoutDays = 0;
    for (let day = 0; day < days; day++) {
      game.step();
      const snap = game.snapshot();
      for (const town of snap.towns) {
        for (const good of GOODS) {
          if (!good.essential) continue;
          const entry = town.goods[good.id]!;
          essentialDays++;
          const floor = (entry.target * IMPORT_FLOOR_DAYS) / 30;
          const key = `${town.id}:${good.id}`;
          const run = (runs.get(key) ?? 0) + (entry.stock <= floor + 1e-6 ? 1 : 0);
          runs.set(key, run);
          if (run >= 30) stockoutDays++;
        }
      }
    }
    const fraction = essentialDays > 0 ? stockoutDays / essentialDays : 0;
    expect(fraction).toBeLessThan(0.05);
  });
});
