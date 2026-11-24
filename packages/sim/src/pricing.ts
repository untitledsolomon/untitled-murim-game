import {
  BASE_PRICES,
  PRICE_CEIL,
  PRICE_FLOOR,
  STOCK_RESPONSE,
  TRADE_SPREAD,
} from "./constants";
import { factor, sumFactors } from "./explain";
import type { MarketEntry, World } from "./state";
import type { GoodId, Price, TownId } from "./types";

/** The price multiplier at a given stock level: f(stock) in the model. */
function multiplierAtStock(entry: MarketEntry, stock: number): number {
  const target = Math.max(entry.target, 1);
  const mult = 1 + (STOCK_RESPONSE * (entry.target - stock)) / target;
  return Math.max(PRICE_FLOOR, Math.min(PRICE_CEIL, mult));
}

/** The current scarcity multiplier for a market entry, from its stock. */
export function stockMultiplier(entry: MarketEntry): number {
  return multiplierAtStock(entry, entry.stock);
}

function marketEntry(world: World, townId: TownId, goodId: GoodId): MarketEntry {
  const entry = world.markets[townId]?.[goodId];
  if (entry === undefined) {
    return { base: BASE_PRICES[goodId] ?? 1, stock: 0, production: 0, dailyConsumption: 0, target: 0 };
  }
  return entry;
}

/**
 * Spot price of one unit right now. Value = base × multiplier; the base price
 * and the local supply-vs-demand gap are the two contributors, and the value
 * is their exact sum.
 */
export function marketPrice(world: World, townId: TownId, goodId: GoodId): Price {
  const entry = marketEntry(world, townId, goodId);
  const mult = multiplierAtStock(entry, entry.stock);
  return sumFactors([
    factor("Base price", entry.base),
    factor("Local supply vs demand", entry.base * (mult - 1)),
  ]);
}

/** Simple numeric spot price, no explanation attached. */
export function marketPriceValue(world: World, townId: TownId, goodId: GoodId): number {
  return marketPrice(world, townId, goodId).value;
}

/**
 * The cost of buying `quantity` units right now. Each unit bought empties the
 * market a little, so later units cost a little more. The value is the base
 * price times the sum of the per-unit multipliers, split exactly into three
 * factors: the base price, the spot supply-vs-demand gap, and the effect of
 * the size of the order.
 */
export function quoteBuy(world: World, townId: TownId, goodId: GoodId, quantity: number): Price {
  const entry = marketEntry(world, townId, goodId);
  const q = Math.min(Math.floor(quantity), Math.floor(entry.stock));

  const mults: number[] = [];
  let stock = entry.stock;
  for (let i = 0; i < q; i++) {
    mults.push(multiplierAtStock(entry, stock));
    stock -= 1;
  }

  const mult1 = mults[0] ?? multiplierAtStock(entry, entry.stock);
  const impact = mults.reduce((sum, mult) => sum + (mult - mult1), 0);
  return sumFactors([
    factor("Base price", q * entry.base),
    factor("Supply vs demand (spot)", entry.base * q * (mult1 - 1)),
    factor("Size of your order", entry.base * impact),
  ]);
}

/**
 * The proceeds of selling `quantity` units right now. Selling restocks the
 * market, so each further unit fetches a little less. On top of the same two
 * factors as a buy, a seller pays the market spread on every unit sold.
 */
export function quoteSell(world: World, townId: TownId, goodId: GoodId, quantity: number): Price {
  const entry = marketEntry(world, townId, goodId);
  const q = Math.floor(quantity);

  const mults: number[] = [];
  for (let i = 0; i < q; i++) {
    mults.push(multiplierAtStock(entry, entry.stock + i));
  }

  const mult1 = mults[0] ?? multiplierAtStock(entry, entry.stock);
  const impact = mults.reduce((sum, mult) => sum + (mult - mult1), 0);
  const sumMult = mults.reduce((sum, mult) => sum + mult, 0);
  return sumFactors([
    factor("Base price", q * entry.base),
    factor("Supply vs demand (spot)", entry.base * q * (mult1 - 1)),
    factor("Size of your order", entry.base * impact),
    factor("Market spread", -entry.base * TRADE_SPREAD * sumMult),
  ]);
}
