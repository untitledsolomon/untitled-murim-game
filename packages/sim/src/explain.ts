import type { Factor, Price } from "./types";

export function factor(label: string, amount: number): Factor {
  return { label, amount };
}

/** Build an explainable number from a value and its contributing factors. */
export function explained(value: number, factors: Factor[] = []): Price {
  return { value: round(value), factors };
}

/** A price built from an exact list of factors; the value is their sum. */
export function sumFactors(factors: Factor[], decimals = 2): Price {
  const value = round(factors.reduce((total, f) => total + f.amount, 0), decimals);
  return { value, factors };
}

/** Sum several explainable numbers into one, keeping all factors. */
export function sumPrices(prices: Price[]): Price {
  const factors: Factor[] = [];
  for (const price of prices) factors.push(...price.factors);
  return sumFactors(factors);
}

/** Multiply an explainable number by a scalar, scaling every factor too. */
export function scalePrice(price: Price, scalar: number): Price {
  return sumFactors(price.factors.map((f) => factor(f.label, f.amount * scalar)));
}

/** Add one factor to an explainable number (immutably) and recompute the value. */
export function addFactor(price: Price, label: string, amount: number): Price {
  return sumFactors([...price.factors, factor(label, amount)]);
}

/** Round to a fixed number of decimals so values stay readable and stable. */
export function round(value: number, decimals = 2): number {
  const power = 10 ** decimals;
  return Math.round(value * power) / power;
}
