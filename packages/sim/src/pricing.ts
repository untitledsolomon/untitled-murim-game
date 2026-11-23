import { addFactor, factor } from "./explain";
import type { GoodId, Price, TownId } from "./types";
import type { World } from "./state";

/**
 * The current market price of a good in a town.
 * Value = base price + base price × trend. Each contributor is explained.
 */
export function marketPrice(world: World, townId: TownId, goodId: GoodId): Price {
  const entry = world.markets[townId]?.[goodId];
  const base = entry?.base ?? 1;
  const trend = entry?.trend ?? 0;
  const baseFactor = factor("Base price", base);
  const trendFactor = factor("Local surplus or deficit", base * trend);
  const raw = base + base * trend;
  return {
    value: Math.round(raw * 100) / 100,
    factors: [baseFactor, trendFactor],
  };
}

/** Simple numeric price, no explanation attached. */
export function marketPriceValue(world: World, townId: TownId, goodId: GoodId): number {
  return marketPrice(world, townId, goodId).value;
}

/** Current sell price: buy price less a small market spread. */
export function sellPrice(world: World, townId: TownId, goodId: GoodId): Price {
  const buy = marketPrice(world, townId, goodId);
  return addFactor(buy, "Market spread", -buy.value * 0.05);
}
