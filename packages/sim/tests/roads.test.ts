import { describe, expect, test } from "bun:test";
import { createGame, isConnected, shortestPath, type Game } from "../src/index";
import type { TownId } from "../src/types";

/** Step until the person arrives at `target`, with a safety cap. */
function waitForArrival(game: Game, personId: string, target: string): void {
  for (let i = 0; i < 300 && game.world.people[personId]!.location !== target; i++) game.step();
}

describe("phase 3: road graph and travel", () => {
  test("the road network connects every town over many seeds", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const game = createGame(seed);
      expect(game.world.roads.length, `seed ${seed} has roads`).toBeGreaterThan(0);
      expect(isConnected(game.world), `seed ${seed} road network connected`).toBe(true);
    }
  });

  test("shortestPath returns a valid route between two towns", () => {
    const game = createGame(23);
    const towns = game.snapshot().towns;
    const plan = shortestPath(game.world, towns[0]!.id, towns[1]!.id);
    expect(plan).not.toBeNull();
    expect(plan!.path[0]).toBe(towns[0]!.id);
    expect(plan!.path[plan!.path.length - 1]).toBe(towns[1]!.id);
    for (const town of plan!.path) {
      expect(game.world.towns.some((t) => t.id === town)).toBe(true);
    }
    expect(plan!.days).toBeGreaterThanOrEqual(1);
    expect(plan!.legs).toHaveLength(plan!.path.length - 1);
    expect(plan!.legs.reduce((a, b) => a + b, 0)).toBe(plan!.days);
  });

  test("a flooded road is avoided when ignoreFlooded is true", () => {
    const game = createGame(71);
    // Pick a road that is not the only connection between its endpoints.
    let victim = game.world.roads[0]!;
    let found = false;
    for (const road of game.world.roads) {
      road.status = "flooded";
      const alternate = shortestPath(game.world, road.a, road.b);
      road.status = "open";
      if (alternate !== null) {
        victim = road;
        found = true;
        break;
      }
    }
    expect(found).toBe(true); // the network has redundant roads
    victim.status = "flooded";
    const plan = shortestPath(game.world, victim.a, victim.b);
    expect(plan).not.toBeNull();
    // The flooded edge never shows up as two consecutive towns in the plan.
    for (let i = 0; i < plan!.path.length - 1; i++) {
      const pair = `${plan!.path[i]}:${plan!.path[i + 1]}`;
      const reverse = `${plan!.path[i + 1]}:${plan!.path[i]}`;
      expect(pair).not.toBe(`${victim.a}:${victim.b}`);
      expect(reverse).not.toBe(`${victim.a}:${victim.b}`);
    }
  });

  test("with ignoreFlooded false a flooded road is still usable", () => {
    const game = createGame(72);
    const road = game.world.roads[0]!;
    road.status = "flooded";
    expect(shortestPath(game.world, road.a, road.b, false)).not.toBeNull();
  });

  test("an unreachable town yields a null route and a travel-failed outcome", () => {
    const game = createGame(17);
    const home = game.snapshot().player.location!;
    const target = game.snapshot().towns.find((t) => t.id !== home)!.id;
    // Flood every road touching the target so it becomes unreachable.
    for (const road of game.world.roads) {
      if (road.a === target || road.b === target) road.status = "flooded";
    }
    expect(shortestPath(game.world, home, target)).toBeNull();
    game.send({ kind: "player" }, { kind: "travel", to: target });
    expect(game.world.history.at(-1)).toMatchObject({ kind: "travel-failed" });
  });

  test("travelling to an unknown town fails cleanly", () => {
    const game = createGame(18);
    game.send({ kind: "player" }, { kind: "travel", to: "town-999999" });
    expect(game.world.history.at(-1)).toMatchObject({ kind: "travel-failed" });
  });

  test("a traveller cannot change route mid-journey", () => {
    const game = createGame(19);
    const towns = game.snapshot().towns;
    const home = game.snapshot().player.location!;
    const townsAway = towns.filter((t) => t.id !== home);
    const first = townsAway[0]!.id;
    const second = townsAway[1]!.id;
    game.send({ kind: "player" }, { kind: "travel", to: first });
    expect(game.snapshot().player.location).toBeNull();
    game.send({ kind: "player" }, { kind: "travel", to: second });
    expect(game.world.history.at(-1)).toMatchObject({ kind: "travel-failed" });
  });

  test("the route toll and arrival are recorded on arrival", () => {
    const game = createGame(31);
    const home = game.snapshot().player.location!;
    const target = game.snapshot().towns.find((t) => t.id !== home)!.id;
    const plan = shortestPath(game.world, home, target)!;
    const cashBefore = game.snapshot().player.cash;
    game.send({ kind: "player" }, { kind: "travel", to: target });
    waitForArrival(game, game.snapshot().player.personId, target);
    const expectedToll = Math.min(plan.toll, cashBefore);
    expect(game.snapshot().player.cash).toBe(cashBefore - expectedToll);
    expect(game.snapshot().player.location).toBe(target);
    // NPC traders act on the same day, so the world history's last entry is not
    // necessarily the player's; read the player's own latest outcome.
    const mine = [...game.world.history].reverse().find((h) => h.actorId === game.snapshot().player.personId);
    expect(mine?.text).toContain("tolls");
  });

  test("buying beyond the carry capacity fails cleanly", () => {
    const game = createGame(41);
    const at = game.snapshot().player.location!;
    // The player starts with 10 grain (10 weight); capacity is 60, so 50 free.
    game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 51 });
    expect(game.world.history.at(-1)).toMatchObject({ kind: "trade-failed" });
    game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 50 });
    expect(game.world.history.at(-1)).toMatchObject({ kind: "trade" });
    expect(game.snapshot().player.stock.grain).toBe(60);
    // The load is now full; one more of anything cannot fit.
    game.send({ kind: "player" }, { kind: "buy", good: "salt", at, quantity: 1 });
    expect(game.world.history.at(-1)).toMatchObject({ kind: "trade-failed" });
  });

  test("the snapshot exposes roads, county bounds, and a live journey", () => {
    const game = createGame(51);
    const snap = game.snapshot();
    expect(snap.roads.length).toBe(game.world.roads.length);
    expect(snap.counties[0]!.bounds.minX).toBeLessThan(snap.counties[0]!.bounds.maxX);
    expect(snap.roads.every((r) => r.danger >= 0 && r.danger <= 1)).toBe(true);

    const home = snap.player.location!;
    const target = snap.towns.find((t) => t.id !== home)!.id;
    game.send({ kind: "player" }, { kind: "travel", to: target });
    const travelling = game.snapshot();
    expect(travelling.player.location).toBeNull();
    expect(travelling.player.journey).not.toBeNull();
    expect(travelling.player.journey!.to).toBe(target);
    const [x, y] = travelling.player.position;
    expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);

    // The days-to-go shrink one per day until arrival.
    game.step();
    const after = game.snapshot();
    expect(after.player.journey!.eta).toBeLessThan(travelling.player.journey!.eta);
  });
});
