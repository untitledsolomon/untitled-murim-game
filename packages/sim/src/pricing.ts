import { addFactor, factor, sumFactors } from "./explain";
import type { GoodId, Price, TownId } from "./types";
import type { World } from "./state";

/**
 * The current market price of a good in a town.
 * Value = base price + base price × trend. Each contributor is explained,
 * and the value is the exact sum of the factors.
 */
export function marketPrice(world: World, townId: TownId, goodId: GoodId): Price {
  const entry = world.markets[townId]?.[goodId];
  const base = entry?.base ?? 1;
  const trend = entry?.trend ?? 0;
  return sumFactors([
    factor("Base price", base),
    // Positive trend means the price sits above base, i.e. the good is scarce.
    factor("Local supply vs demand", base * trend),
  ]);
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
