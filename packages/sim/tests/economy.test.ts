import { describe, expect, test } from "bun:test";
import { createGame, GOODS, quoteBuy, quoteSell, shortestPath, stockMultiplier } from "../src/index";
import type { Price } from "../src/types";

/** Sum of a quote's factors; equals its value up to 2-decimal rounding. */
function factorSum(price: Price): number {
  return price.factors.reduce((sum, factor) => sum + factor.amount, 0);
}

const ESSENTIAL = GOODS.filter((good) => good.essential);

describe("phase 4a: stock economy and pricing", () => {
  test("the spot price is base times a clamped scarcity multiplier", () => {
    const game = createGame(201);
    const town = game.snapshot().towns[0]!;
    for (const good of GOODS) {
      const entry = game.world.markets[town.id]![good.id]!;
      const spot = town.goods[good.id]!.market;
      expect(spot.value).toBeCloseTo(entry.base * stockMultiplier(entry), 0);
      expect(stockMultiplier(entry)).toBeGreaterThanOrEqual(0.4);
      expect(stockMultiplier(entry)).toBeLessThanOrEqual(3.0);
    }
  });

  test("spot factors always sum exactly to the value", () => {
    const game = createGame(202);
    for (const town of game.snapshot().towns) {
      for (const good of GOODS) {
        const market = town.goods[good.id]!.market;
        expect(factorSum(market)).toBeCloseTo(market.value, 1);
      }
    }
  });

  test("buy and sell quote factors always sum exactly to the value", () => {
    const game = createGame(203);
    const at = game.snapshot().player.location!;
    for (const quantity of [1, 3, 7, 20]) {
      const buy = quoteBuy(game.world, at, "grain", quantity);
      expect(factorSum(buy)).toBeCloseTo(buy.value, 1);
      const sell = quoteSell(game.world, at, "grain", quantity);
      expect(factorSum(sell)).toBeCloseTo(sell.value, 1);
    }
  });

  test("buying lowers the market stock and raises the price paid later", () => {
    const game = createGame(204);
    const at = game.snapshot().player.location!;
    const before = stockMultiplier(game.world.markets[at]!.grain!);
    game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 40 });
    const after = stockMultiplier(game.world.markets[at]!.grain!);
    expect(after).toBeGreaterThan(before);
  });

  test("a same-town round trip loses exactly the spread", () => {
    const game = createGame(205);
    const at = game.snapshot().player.location!;
    const start = game.snapshot().player.cash;
    game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 10 });
    const afterBuy = game.snapshot().player.cash;
    game.send({ kind: "player" }, { kind: "sell", good: "grain", at, quantity: 10 });
    const afterSell = game.snapshot().player.cash;
    // Selling adds the same stock back, so buy and sell see the same per-unit
    // multipliers; only the spread is lost, so cash cannot recover to start.
    expect(afterBuy).toBeLessThan(start);
    expect(afterSell).toBeGreaterThan(afterBuy); // selling returns cash...
    expect(afterSell).toBeLessThan(start); // ...but not all of it
    expect(game.world.markets[at]!.grain!.stock).toBeCloseTo(
      game.snapshot().towns.find((t) => t.id === at)!.goods.grain.target,
      1,
    );
  });

  test("sell orders into a stocked market depress the price but never go negative", () => {
    const game = createGame(206);
    const at = game.snapshot().player.location!;
    const quote = quoteSell(game.world, at, "grain", 5);
    expect(quote.value).toBeGreaterThan(0);
    const sizeFactor = quote.factors.find((factor) => factor.label === "Size of your order")?.amount ?? 0;
    expect(sizeFactor).toBeLessThanOrEqual(0);
  });

  test("a buy beyond the market's stock takes only what the market has", () => {
    const game = createGame(207);
    const at = game.snapshot().player.location!;
    const available = Math.floor(game.world.markets[at]!.salt!.stock);
    expect(available).toBeGreaterThan(0);
    // 40 salt fits the carry limit but exceeds any store a town holds.
    game.send({ kind: "player" }, { kind: "buy", good: "salt", at, quantity: 40 });
    expect(game.world.history.at(-1)).toMatchObject({ kind: "trade" });
    expect(game.snapshot().player.stock.salt).toBe(available);
  });

  test("buying beyond cash fails cleanly without touching the market", () => {
    const game = createGame(208);
    const at = game.snapshot().player.location!;
    const stockBefore = game.world.markets[at]!.tea!.stock;
    game.send({ kind: "player" }, { kind: "buy", good: "tea", at, quantity: 1_000_000 });
    expect(game.world.history.at(-1)).toMatchObject({ kind: "trade-failed" });
    expect(game.world.markets[at]!.tea!.stock).toBe(stockBefore);
  });

  test("shortages raise unrest, bounded and mean-reverting", () => {
    const game = createGame(209);
    const town = game.world.towns[0]!;
    for (const good of GOODS) game.world.markets[town.id]![good.id]!.stock = 0;
    const before = town.unrest;
    game.step();
    expect(town.unrest).toBeGreaterThan(before);
    for (let i = 0; i < 200; i++) game.step();
    expect(town.unrest).toBeLessThanOrEqual(0.6 + 0.001);
  });

  test("no NaN or negative stock survives a long run with trading", () => {
    const game = createGame(210);
    const at = game.snapshot().player.location!;
    for (let i = 0; i < 120; i++) {
      for (const town of game.world.towns) {
        for (const good of GOODS) {
          const entry = game.world.markets[town.id]![good.id]!;
          expect(Number.isFinite(entry.stock)).toBe(true);
          expect(entry.stock).toBeGreaterThanOrEqual(0);
        }
      }
      if (i % 5 === 0) game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 2 });
      if (i % 7 === 0) game.send({ kind: "player" }, { kind: "sell", good: "grain", at, quantity: 1 });
      game.step();
    }
  });

  test("stability: total production exceeds total consumption per good", () => {
    const game = createGame(211);
    for (const good of GOODS) {
      let production = 0;
      let consumption = 0;
      for (const town of game.world.towns) {
        production += game.world.markets[town.id]![good.id]!.production;
        consumption += game.world.markets[town.id]![good.id]!.dailyConsumption;
      }
      expect(production, good.id).toBeGreaterThanOrEqual(1.1 * consumption);
    }
  });

  test("stability: every town can reach a producer of every essential good", () => {
    const game = createGame(211);
    for (const good of ESSENTIAL) {
      const producers = game.world.towns.filter((t) => game.world.markets[t.id]![good.id]!.production > 0);
      expect(producers.length, good.id).toBeGreaterThan(0);
      for (const town of game.world.towns) {
        const reachable = producers.some((producer) => shortestPath(game.world, town.id, producer.id) !== null);
        expect(reachable, `${good.id} from ${town.id}`).toBe(true);
      }
    }
  });

  test("base prices are global: no town is a free lunch at day 0", () => {
    const game = createGame(212);
    const bases = new Map<string, number[]>();
    for (const town of game.snapshot().towns) {
      for (const good of GOODS) {
        const list = bases.get(good.id) ?? [];
        list.push(town.goods[good.id]!.basePrice);
        bases.set(good.id, list);
      }
    }
    for (const good of GOODS) {
      const list = bases.get(good.id)!;
      const spread = Math.max(...list) - Math.min(...list);
      // Each base price is within ±5% of the global base, so the widest gap
      // between two towns is roughly 10%.
      expect(spread, good.id).toBeLessThanOrEqual(0.11 * list[0]!);
    }
  });
});
