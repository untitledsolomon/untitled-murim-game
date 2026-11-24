import {
  CARRY_CAPACITY,
  GOODS,
  PRICE_CEIL,
  PRICE_FLOOR,
  STOCK_RESPONSE,
  TRADER_BUY_SAFETY,
  TRADER_MIN_MARGIN,
  TRADER_RANGE,
  TRADER_STAGGER,
  TRADE_SPREAD,
  goodWeight,
} from "./constants";
import { submitCommand } from "./commands";
import { quoteBuy } from "./pricing";
import { hashStr } from "./rng";
import { buildSnapshot } from "./snapshot";
import type { Person, World } from "./state";
import type { GoodId, Snapshot, TownId } from "./types";

/** What a trader decided to do next. `tradeAt` is where the trade happens. */
export interface TraderPlan {
  kind: "buy" | "sell";
  good: GoodId;
  quantity: number;
  /** The town the trade happens in (the source for a buy, the sale for a sell). */
  tradeAt: TownId;
  /** Travel here first; null means trade at the current town right now. */
  travelTo: TownId | null;
  /** Buy plans only: the town expected to resell at, travelled to after buying. */
  sellTarget?: TownId;
  /** Expected net profit in cash (proceeds less tolls) at decision time. */
  expectedProfit: number;
}

interface Reach {
  days: number;
  toll: number;
}

/** The market row the snapshot exposes for one town and good. */
interface MarketRow {
  basePrice: number;
  target: number;
  stock: number;
}

function marketRow(snap: Snapshot, town: TownId, good: GoodId): MarketRow | undefined {
  const entry = snap.towns.find((t) => t.id === town)?.goods[good];
  if (entry === undefined) return undefined;
  return { basePrice: entry.basePrice, target: entry.target, stock: entry.stock };
}

/** The multiplier f(stock) a town's market applies at a stock level. */
function multiplierAt(entry: MarketRow, stock: number): number {
  const target = Math.max(entry.target, 1);
  const mult = 1 + (STOCK_RESPONSE * (entry.target - stock)) / target;
  return Math.max(PRICE_FLOOR, Math.min(PRICE_CEIL, mult));
}

/**
 * The price the whole load realizes per unit, at the market's stock level, for a
 * move of `quantity` units. A trader prices its load at its true average value —
 * not at the spot the first unit fetches — so a move that would crash a small
 * market is priced honestly, exactly like the player's quote does
 * (docs/decisions.md Phase 4b). Buying draws stock down (later units cost more);
 * selling pushes it back up (later units fetch less). O(1) via sumMultipliers.
 */
function realizedPrice(entry: MarketRow, quantity: number, buying: boolean): number {
  if (quantity < 1) return 0;
  if (buying) {
    const q = Math.min(quantity, Math.floor(entry.stock));
    if (q < 1) return 0;
    // Buying empties the market: the first unit costs the current stock level,
    // the last costs stock - q + 1. Average over that run, times the base price.
    return (sumMultipliers(entry.target, entry.stock - q + 1, q) / q) * entry.basePrice;
  }
  // Selling fills the market: units fetch the current level upward. The sell
  // spread is paid on every unit.
  return (sumMultipliers(entry.target, entry.stock, quantity) / quantity) * entry.basePrice * (1 - TRADE_SPREAD);
}

/** Cache of reach maps keyed by snapshot, shared by every trader that day. */
const reachBySnapshot = new WeakMap<Snapshot, Map<TownId, Map<TownId, Reach>>>();

/**
 * Every town within `TRADER_RANGE` road-days of `from`, with the travel days
 * and toll to reach it, Dijkstra over the snapshot's roads. This is the whole
 * "knowledge" the trader uses — a stand-in for real knowledge, which fog
 * arrives with in Phase 5 (see docs/decisions.md). All towns reach the map in
 * one run; a trader's own range trims it to what it may act on.
 */
function reachMap(snap: Snapshot, from: TownId): Map<TownId, Reach> {
  const cached = reachBySnapshot.get(snap);
  if (cached !== undefined) {
    const entry = cached.get(from);
    if (entry !== undefined) return entry;
  } else {
    reachBySnapshot.set(snap, new Map());
  }

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
      if (road.status === "flooded") continue; // same rule shortestPath applies
      if (road.a !== best && road.b !== best) continue;
      const next = road.a === best ? road.b : road.a;
      if (settled.has(next)) continue;
      const days = current.days + road.travelDays;
      const toll = current.toll + road.toll;
      const existing = dist.get(next);
      if (existing === undefined || days < existing.days || (days === existing.days && toll < existing.toll)) {
        dist.set(next, { days, toll });
      }
    }
  }
  const reach = new Map<TownId, Reach>();
  for (const [town, r] of dist) if (r.days <= TRADER_RANGE) reach.set(town, r);
  reachBySnapshot.get(snap)!.set(from, reach);
  return reach;
}

/**
 * Sum of the price multipliers a market of `target` days applies over a run of
 * consecutive stock levels, closed form. The multiplier is clamped linear in
 * stock — flat at the price ceiling below zero stock, linear between, flat at
 * the floor above 1.3× the target — so the sum is three pieces of a running
 * arithmetic series, not a loop. Keeps a whole-load quote O(1).
 */
function sumMultipliers(target: number, fromStock: number, count: number): number {
  if (count <= 0) return 0;
  const t = Math.max(target, 1);
  const lo = fromStock;
  const hi = fromStock + count;
  const ceilingStart = Math.min(hi, 0); // multiplier sits at the ceiling while stock <= 0
  const ceilingCount = Math.max(0, ceilingStart - lo);
  const floorStart = Math.max(lo, Math.ceil(1.3 * t)); // multiplier at the floor from 1.3x target
  const floorCount = Math.max(0, hi - floorStart);
  const midLo = Math.max(lo, 0);
  const midHi = Math.min(hi, floorStart);
  const midCount = Math.max(0, midHi - midLo);
  let sum = ceilingCount * PRICE_CEIL + floorCount * PRICE_FLOOR;
  if (midCount > 0) {
    const first = multiplierAt({ basePrice: 1, target: t, stock: midLo }, midLo);
    const last = multiplierAt({ basePrice: 1, target: t, stock: midHi - 1 }, midHi - 1);
    sum += (midCount * (first + last)) / 2;
  }
  return sum;
}

/**
 * Decide a buy: among the towns within range of the trader (including where
 * they stand), and among all goods, pick the source, quantity, and resale town
 * that promise the best profit for one trip. Both the bill and the proceeds
 * are the realized whole-load prices, so a trade that would crash the target
 * market is only worth what it truly fetches after the spread and both tolls.
 * Never risks more than a fixed share of cash, and never plans a bill it cannot
 * afford — a failed buy command would waste the whole trip.
 */
export function planTraderBuy(snap: Snapshot, from: TownId, cash: number): TraderPlan | null {
  const reach = reachMap(snap, from);
  let best: TraderPlan | null = null;
  for (const good of GOODS) {
    const weight = goodWeight(good.id);
    for (const [source, sourceReach] of reach) {
      const srcRow = marketRow(snap, source, good.id);
      if (srcRow === undefined || srcRow.stock < 1) continue;
      let quantity = Math.min(Math.floor(CARRY_CAPACITY / weight), Math.floor(srcRow.stock));
      while (quantity > 0 && realizedPrice(srcRow, quantity, true) * quantity > cash * TRADER_BUY_SAFETY) {
        quantity--;
      }
      if (quantity < 1) continue;
      const bill = realizedPrice(srcRow, quantity, true) * quantity;
      for (const [target, targetReach] of reachMap(snap, source)) {
        if (target === source) continue;
        const tgtRow = marketRow(snap, target, good.id);
        if (tgtRow === undefined) continue;
        const proceeds = realizedPrice(tgtRow, quantity, false) * quantity;
        const net = proceeds - bill - sourceReach.toll - targetReach.toll;
        if (best === null || net > best.expectedProfit) {
          best = {
            kind: "buy",
            good: good.id,
            quantity,
            tradeAt: source,
            travelTo: source === from ? null : source,
            sellTarget: target,
            expectedProfit: net,
          };
        }
      }
    }
  }
  if (best === null || best.expectedProfit < TRADER_MIN_MARGIN) return null;
  return best;
}

/**
 * Decide a sale for a carried good: sell at the reachable town (including the
 * trader's own) that nets the most cash after the toll, and go there if it is
 * not the current town. The proceeds of the whole load are valued at the
 * realized average, not the spot the first unit fetches. A trader always
 * liquidates cargo — holding never earns — so the plan is null only when the
 * trader cannot reach anywhere at all.
 */
export function planTraderSell(snap: Snapshot, from: TownId, good: GoodId, quantity: number): TraderPlan {
  const reach = reachMap(snap, from);
  const localRow = marketRow(snap, from, good);
  const localProceeds = localRow === undefined ? 0 : realizedPrice(localRow, quantity, false) * quantity;
  let bestTown = from;
  let bestNet = localProceeds;
  for (const [town, townReach] of reach) {
    if (town === from) continue;
    const row = marketRow(snap, town, good);
    if (row === undefined) continue;
    const net = realizedPrice(row, quantity, false) * quantity - townReach.toll;
    if (net > bestNet) {
      bestNet = net;
      bestTown = town;
    }
  }
  if (bestTown === from) {
    return { kind: "sell", good, quantity, tradeAt: from, travelTo: null, expectedProfit: bestNet };
  }
  return { kind: "sell", good, quantity, tradeAt: bestTown, travelTo: bestTown, expectedProfit: bestNet };
}

/** The first good this person carries more than zero of, in good order. */
function firstPositiveGood(stock: Person["stock"]): GoodId | null {
  for (const good of GOODS) {
    if ((stock[good.id] ?? 0) > 0) return good.id;
  }
  return null;
}

/**
 * Re-check a buy plan against the live market it will actually execute on.
 * Plans are sized against the day-start snapshot, but traders act in sequence:
 * an earlier trader may have drained (or stocked) the source since. The order
 * executes at today's live prices, so it is only safe to submit when the full
 * planned load still fits the safety budget. If the market moved beyond that,
 * the trader stands down rather than carry a shrunken load across both tolls —
 * a partial fill would pay the round-trip toll on a fraction of the cargo and
 * turn a planned profit into a guaranteed loss.
 */
function liveAffordableQuantity(world: World, town: TownId, good: GoodId, budget: number, planned: number): number {
  const entry = world.markets[town]?.[good];
  if (entry === undefined || entry.stock < 1) return 0;
  const row: MarketRow = { basePrice: entry.base, target: entry.target, stock: entry.stock };
  if (realizedPrice(row, planned, true) * planned <= budget) return planned;
  return 0;
}

/**
 * The day trader decisions run. Each trader with a decision day and nothing to
 * do right now plans one action and submits it through the same command path
 * as the player. Decisions are staggered so only one in `TRADER_STAGGER` of the
 * traders thinks on any given day — the trade-off between liveliness and the
 * hot-loop cost of planning.
 */
export function runTraders(world: World): void {
  const traders: Person[] = [];
  for (const personId of Object.keys(world.people)) {
    const person = world.people[personId];
    if (person.isTrader) traders.push(person);
  }
  if (traders.length === 0) return;

  const snap = buildSnapshot(world);
  for (const trader of traders) {
    if (trader.journey !== null || trader.location === null) continue;
    const phase = hashStr(trader.id) % TRADER_STAGGER;
    if ((world.day + phase) % TRADER_STAGGER !== 0) continue;

    const actor = { kind: "person" as const, id: trader.id };
    const held = firstPositiveGood(trader.stock);
    if (held !== null) {
      const plan = planTraderSell(snap, trader.location, held, trader.stock[held] ?? 0);
      if (plan.travelTo === null) {
        submitCommand(world, actor, { kind: "sell", good: plan.good, at: trader.location, quantity: plan.quantity }, false);
      } else {
        submitCommand(world, actor, { kind: "travel", to: plan.travelTo }, false);
      }
    } else {
      const plan = planTraderBuy(snap, trader.location, trader.wealth);
      if (plan === null) continue; // nothing profitable in range: sit idle
      if (plan.travelTo !== null) {
        submitCommand(world, actor, { kind: "travel", to: plan.travelTo }, false);
      } else {
        // The buy executes against the live market now, not the day-start
        // snapshot it was planned on. Re-quote the whole load and shrink it to
        // what the trader can really pay — or stand down — so the command never
        // fails validation after an earlier trader moved this market.
        const quantity = liveAffordableQuantity(
          world,
          trader.location,
          plan.good,
          trader.wealth * TRADER_BUY_SAFETY,
          plan.quantity,
        );
        if (quantity < 1) continue;
        submitCommand(world, actor, { kind: "buy", good: plan.good, at: trader.location, quantity }, false);
        if (plan.sellTarget !== undefined && plan.sellTarget !== trader.location) {
          submitCommand(world, actor, { kind: "travel", to: plan.sellTarget }, false);
        }
      }
    }
  }
}
