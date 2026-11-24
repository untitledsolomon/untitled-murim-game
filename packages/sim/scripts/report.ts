#!/usr/bin/env bun
// The Phase 4 balance harness. Prints the state of the economy over a long
// run and how a careful and a careless trading bot fare, then judges every
// Phase 4 checkpoint target PASS/FAIL.
//
//   bun --cwd packages/sim scripts/report.ts [seed=1337] [years=50]
//
// Bots act exactly like a player: they read the fogged snapshot and send
// commands through Game.send only. The careful bot replays the same greedy
// planner the NPC traders use (planTraderBuy/Sell); the careless bot trades at
// random. Both run 2 full game years (720 days).
import { BASE_PRICES, createGame, DAYS_PER_YEAR, GOODS, planTraderBuy, planTraderSell, TRADE_SPREAD } from "../src/index";
import type { CommandSpec, Outcome, Snapshot, TownId } from "../src/types";

const seed = Number(process.argv[2]) || 1337;
const years = Number(process.argv[3]) || 50;
const days = years * DAYS_PER_YEAR;
const BOT_DAYS = 2 * DAYS_PER_YEAR;

/* ------------------------------------------------------------------ */
/* Small deterministic host rng for the careless bot's randomness only   */
/* ------------------------------------------------------------------ */
function hostRng(seedValue: number): () => number {
  let s = seedValue >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Reachability over the snapshot's roads, for margin measurement       */
/* ------------------------------------------------------------------ */
interface Reach {
  days: number;
  toll: number;
}
function reachMap(snap: Snapshot, from: TownId): Map<TownId, Reach> {
  const dist = new Map<TownId, Reach>([[from, { days: 0, toll: 0 }]]);
  const settled = new Set<TownId>();
  for (;;) {
    let best: TownId | null = null;
    let bestDays = Infinity;
    for (const [town, reach] of dist) {
      if (!settled.has(town) && reach.days < bestDays) {
        best = town;
        bestDays = reach.days;
      }
    }
    if (best === null) break;
    settled.add(best);
    const current = dist.get(best)!;
    for (const road of snap.roads) {
      if (road.a !== best && road.b !== best) continue;
      const next = road.a === best ? road.b : road.a;
      if (settled.has(next)) continue;
      const routeDays = current.days + road.travelDays;
      const toll = current.toll + road.toll;
      const existing = dist.get(next);
      if (existing === undefined || routeDays < existing.days || (routeDays === existing.days && toll < existing.toll)) {
        dist.set(next, { days: routeDays, toll });
      }
    }
  }
  return dist;
}

function spotPrice(snap: Snapshot, town: TownId, goodId: string): number {
  return snap.towns.find((t) => t.id === town)?.goods[goodId]?.market.value ?? 0;
}

/**
 * How far town prices sit from parity, on one sampled day. The mean absolute
 * deviation of the price multiplier from 1 summed over every good and town: 0
 * means every market sits at its base price, and each short or glutted market
 * moves the number up. Traders draining surplus towns and filling deficit towns
 * pull this toward 0, so a trader world with lower dispersion than the same
 * world without traders is direct evidence that NPCs compress margins.
 */
function priceDispersion(snap: Snapshot): number {
  let total = 0;
  let count = 0;
  for (const good of GOODS) {
    for (const town of snap.towns) {
      const entry = town.goods[good.id]!;
      const mult = entry.basePrice > 0 ? entry.market.value / entry.basePrice : 1;
      total += Math.abs(mult - 1);
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}

/** The best arbitrage margin available that day from each town: a fixed 10-unit
 * load of each good, bought at spot in the town, sold at the best reachable
 * town, minus the toll there.
 */
function bestDailyMargins(snap: Snapshot): number[] {
  const best: number[] = [];
  for (const from of snap.towns) {
    const reach = reachMap(snap, from.id);
    let townBest = -Infinity;
    for (const good of GOODS) {
      const buyPerUnit = spotPrice(snap, from.id, good.id);
      if (buyPerUnit <= 0) continue;
      for (const [target, r] of reach) {
        if (target === from.id) continue;
        const margin = 10 * (spotPrice(snap, target, good.id) * (1 - TRADE_SPREAD) - buyPerUnit) - r.toll;
        if (margin > townBest) townBest = margin;
      }
    }
    best.push(townBest);
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Aggregation helpers                                                  */
/* ------------------------------------------------------------------ */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}
function pct(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}
function pass(value: boolean): string {
  return value ? "PASS" : "FAIL";
}

/* ------------------------------------------------------------------ */
/* The two testable bots                                                */
/* ------------------------------------------------------------------ */
function carefulCommands(snap: Snapshot): CommandSpec[] {
  const player = snap.player;
  if (player.location === null) return [];
  const held = GOODS.find((good) => (player.stock[good.id] ?? 0) > 0);
  if (held) {
    const plan = planTraderSell(snap, player.location, held.id, player.stock[held.id] ?? 0);
    if (plan.travelTo !== null) return [{ kind: "travel", to: plan.travelTo }];
    return [{ kind: "sell", good: plan.good, at: player.location, quantity: plan.quantity }];
  }
  const plan = planTraderBuy(snap, player.location, player.cash);
  if (plan === null) return [];
  if (plan.travelTo !== null) return [{ kind: "travel", to: plan.travelTo }];
  const commands: CommandSpec[] = [{ kind: "buy", good: plan.good, at: player.location, quantity: plan.quantity }];
  if (plan.sellTarget !== undefined && plan.sellTarget !== player.location) commands.push({ kind: "travel", to: plan.sellTarget });
  return commands;
}

function carelessCommands(snap: Snapshot, rng: () => number): CommandSpec[] {
  const player = snap.player;
  if (player.location === null) return [];
  const towns = snap.towns;
  const held = GOODS.find((good) => (player.stock[good.id] ?? 0) > 0);
  if (held) {
    const quantity = player.stock[held.id] ?? 0;
    // Half the time sell where it stands; otherwise wander somewhere and sell.
    if (quantity <= 0 || rng() < 0.5) return [{ kind: "sell", good: held.id, at: player.location, quantity: Math.max(1, quantity) }];
    return [{ kind: "travel", to: towns[Math.floor(rng() * towns.length)]!.id }];
  }
  const good = GOODS[Math.floor(rng() * GOODS.length)]!;
  const price = spotPrice(snap, player.location, good.id);
  const quantity = Math.floor((player.cash * 0.5) / Math.max(price, 0.01));
  if (quantity < 1) return [];
  const commands: CommandSpec[] = [{ kind: "buy", good: good.id, at: player.location, quantity }];
  const target = towns[Math.floor(rng() * towns.length)];
  if (target.id !== player.location) commands.push({ kind: "travel", to: target.id });
  return commands;
}

function runBot(seedValue: number, policy: (snap: Snapshot, rng?: () => number) => CommandSpec[], label: string): { start: number; end: number; min: number } {
  const game = createGame(seedValue);
  const rng = policy.length >= 2 ? hostRng(seedValue + 1) : undefined;
  let minCash = game.snapshot().player.cash;
  for (let day = 0; day < BOT_DAYS; day++) {
    const snap = game.snapshot();
    const commands = rng ? policy(snap, rng) : policy(snap);
    for (const command of commands) game.send({ kind: "player" }, command);
    game.step();
    minCash = Math.min(minCash, game.snapshot().player.cash);
  }
  const end = game.snapshot().player.cash;
  console.log(`  ${label}: 200 -> ${end.toFixed(0)} cash over ${BOT_DAYS} days (min ${minCash.toFixed(0)})`);
  return { start: 200, end, min: minCash };
}

/* ------------------------------------------------------------------ */
/* Long-run world statistics                                           */
/* ------------------------------------------------------------------ */
function runWorld() {
  console.log(`=== sim:report seed=${seed} years=${years} ===`);
  const game = createGame(seed);
  const towns = game.world.towns;
  console.log(`  World: ${towns.length} towns, ${game.world.roads.length} roads, ${game.world.organizations.length} organizations, ${Object.values(game.world.people).filter((p) => p.isTrader).length} traders.`);

  const mults: Record<string, number[]> = {};
  for (const good of GOODS) mults[good.id] = [];

  let priceTotal = 0;
  let priceInBounds = 0;
  let nanDays = 0;
  let essentialDays = 0;
  let stockoutDays = 0;
  // Stockout runs tracked per (town, essential good).
  const runs = new Map<string, number>();

  const unrestValues: number[] = [];
  const crimeValues: number[] = [];

  const shockIds = new Set<string>();
  let shocksSpawned = 0;
  let traderBuyTrades = 0;
  let traderSellTrades = 0;
  let lastSeen = null as unknown | null;

  const margins: number[] = [];
  const dispersions: number[] = [];

  const started = performance.now();
  for (let day = 0; day < days; day++) {
    game.step();
    const snap = game.snapshot();
    if (day % 30 === 0) {
      for (const margin of bestDailyMargins(snap)) if (margin > -Infinity) margins.push(margin);
      dispersions.push(priceDispersion(snap));
    }
    // Count shock spawns by new ids (expired shocks are culled each day).
    for (const shock of snap.shocks) {
      if (!shockIds.has(shock.id)) {
        shockIds.add(shock.id);
        shocksSpawned++;
      }
    }

    // Count trader activity from the outcome log since the last day. The log is
    // capped at 500 entries, so walk back from the newest entry to the one we
    // last saw rather than trusting array length.
    const history = game.world.history;
    const walked: Outcome[] = [];
    for (let i = history.length - 1; i >= 0 && walked.length < 200; i--) {
      const entry = history[i]!;
      if (entry === lastSeen) break;
      walked.push(entry);
    }
    lastSeen = history.length > 0 ? history[history.length - 1]! : null;
    for (const entry of walked) {
      const person = entry.actorId === null ? undefined : game.world.people[entry.actorId];
      if (person?.isTrader !== true || entry.kind !== "trade") continue;
      if (entry.text.includes(" sells ")) traderSellTrades++;
      else if (entry.text.includes(" buys ")) traderBuyTrades++;
    }

    for (const town of snap.towns) {
      unrestValues.push(town.unrest);
      crimeValues.push(town.crime);
      for (const good of GOODS) {
        const entry = town.goods[good.id]!;
        const mult = entry.basePrice > 0 ? entry.market.value / entry.basePrice : 1;
        mults[good.id]!.push(mult);
        priceTotal++;
        if (mult >= 0.39 && mult <= 3.01) priceInBounds++;
        if (!Number.isFinite(entry.stock) || entry.stock < 0) nanDays++;
        if (good.essential) {
          essentialDays++;
          const floor = (entry.target * 3) / 30; // IMPORT_FLOOR_DAYS / DAILY_TARGET_DAYS
          const key = `${town.id}:${good.id}`;
          const run = (runs.get(key) ?? 0) + (entry.stock <= floor + 1e-6 ? 1 : 0);
          runs.set(key, run);
          if (run >= 30) stockoutDays++;
        }
      }
    }
  }
  const took = performance.now() - started;
  console.log(`  Simulated ${days} days in ${took.toFixed(0)} ms => ${(took / days).toFixed(3)} ms/day (incl. harvest).`);

  console.log(`  Shocks spawned: ${shocksSpawned}.`);

  const traderWealths = Object.values(game.world.people)
    .filter((p) => p.isTrader)
    .map((p) => p.wealth);
  const broke = traderWealths.filter((w) => w < 20).length;
  console.log(
    `  Traders: ${traderWealths.length}; median final wealth ${median(traderWealths).toFixed(0)}, ${broke} nearly broke (<20 cash); ` +
      `${traderBuyTrades} buy + ${traderSellTrades} sell orders executed.`,
  );

  console.log("  Price multiplier vs base (sampled every day):");
  for (const good of GOODS) {
    const values = mults[good.id]!;
    const min = Math.min(...values);
    const max = Math.max(...values);
    console.log(
      `    ${good.id.padEnd(9)} min ${min.toFixed(3)}  median ${median(values).toFixed(3)}  max ${max.toFixed(3)}  (base ${BASE_PRICES[good.id]})`,
    );
  }
  const priceFraction = priceTotal > 0 ? priceInBounds / priceTotal : 1;
  console.log(`  Fraction of displayed town-day prices within 0.4x-3x: ${(priceFraction * 100).toFixed(3)}% (target >= 99%).`);
  console.log(`  NaN or negative stock town-good-days: ${nanDays} (target 0).`);
  const stockoutFraction = essentialDays > 0 ? stockoutDays / essentialDays : 0;
  console.log(`  Essential stockout town-days inside >=30-day runs: ${(stockoutFraction * 100).toFixed(3)}% (target < 5%).`);

  const marginFirst = margins.slice(0, Math.floor(margins.length / 3));
  const marginLast = margins.slice(-Math.floor(margins.length / 3));
  console.log(
    `  Best arbitrage margin/day: early median ${median(marginFirst).toFixed(0)} -> late median ${median(marginLast).toFixed(0)} (NPC trades should compress it).`,
  );
  console.log(`  Unrest: median ${median(unrestValues).toFixed(2)}, p95 ${pct(unrestValues, 95).toFixed(2)}, max ${Math.max(...unrestValues).toFixed(2)}.`);
  console.log(`  Crime: median ${median(crimeValues).toFixed(2)}, p95 ${pct(crimeValues, 95).toFixed(2)}, max ${Math.max(...crimeValues).toFixed(2)}.`);

  return {
    priceFraction,
    nanDays,
    stockoutFraction,
    msPerDay: took / days,
    margins,
    dispersions,
    traderWealths,
  };
}

/**
 * The world with no traders at all: the same seeded world, stepped with every
 * trader disabled, so towns only have the import floor and their own production
 * to set prices. Cross-town price dispersion here is the counterfactual that
 * shows traders — who drain surplus towns and fill deficit ones — compress the
 * spread, since traders draw no rng and leave the rest of the stream identical.
 */
function runNoTraderWorld(noTraderYears: number): number[] {
  const game = createGame(seed);
  for (const person of Object.values(game.world.people)) person.isTrader = false;
  const dispersions: number[] = [];
  const until = noTraderYears * DAYS_PER_YEAR;
  for (let day = 0; day < until; day++) {
    game.step();
    if (day % 30 === 0) dispersions.push(priceDispersion(game.snapshot()));
  }
  return dispersions;
}

const stats = runWorld();

console.log(`\n  Testable bots (${BOT_DAYS} game days = ${BOT_DAYS / DAYS_PER_YEAR} years):`);
const careful = runBot(seed, (snap) => carefulCommands(snap), "careful bot");
const careless = runBot(seed, (snap, rng) => carelessCommands(snap, rng!), "careless bot");

const carefulDoubles = careful.end >= 400;
const carelessLoses = careless.end < 200;

// NPC compression: cross-town price dispersion is LOWER with traders arbitraging
// the same world than with the same world left to production and import floors
// alone. Traders draw no rng, so disabling them leaves every other system on the
// identical stream.
const noTraderYears = 15;
console.log(`\n  Counterfactual: running ${noTraderYears} more years with all ${stats.traderWealths.length} traders disabled...`);
const noTraderDispersions = runNoTraderWorld(noTraderYears);
const withTraderDispersion = median(stats.dispersions);
const noTraderDispersion = median(noTraderDispersions);
const compressed = withTraderDispersion < noTraderDispersion;
const fast = stats.msPerDay < 2;

console.log("\n=== CHECKPOINT (Phase 4) ===");
console.log(`  [${pass(stats.priceFraction >= 0.99)}] ${(stats.priceFraction * 100).toFixed(2)}% town-day prices within 0.4x-3x (target >= 99%)`);
console.log(`  [${pass(stats.nanDays === 0)}] ${stats.nanDays} NaN/negative stock days (target 0)`);
console.log(`  [${pass(stats.stockoutFraction < 0.05)}] ${(stats.stockoutFraction * 100).toFixed(2)}% essential town-days stockout >=30d (target < 5%)`);
console.log(`  [${pass(carefulDoubles)}] careful bot ${careful.end.toFixed(0)} cash >= 400 (roughly doubles ~200 in ~2 years)`);
console.log(`  [${pass(carelessLoses)}] careless bot ${careless.end.toFixed(0)} cash < 200 (loses)`);
console.log(
  `  [${pass(compressed)}] NPCs compress margins: mean |price - 1| ${withTraderDispersion.toFixed(3)} with traders < ${noTraderDispersion.toFixed(3)} without`,
);
console.log(`  [${pass(fast)}] avg step ${stats.msPerDay.toFixed(3)} ms/day < 2 ms/day`);

process.exit(0);
