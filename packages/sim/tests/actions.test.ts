import { describe, expect, test } from "bun:test";
import { createGame } from "../src/index";
import type { Command } from "../src/types";

describe("commands", () => {
  test("travel moves the player between towns", () => {
    const game = createGame(1);
    const towns = game.snapshot().towns;
    const home = game.snapshot().player.location;
    const target = towns.find((t) => t.id !== home)!.id;
    game.enqueue({ id: "t", actor: { kind: "player" }, day: 0, kind: "travel", to: target });
    game.step();
    expect(game.snapshot().player.location).toBe(target);
  });

  test("buying spends cash and adds stock; selling restores cash", () => {
    const game = createGame(2);
    const towns = game.snapshot().towns;
    const at = towns[0]!.id;
    const before = game.snapshot().player.cash;
    game.enqueue({ id: "b", actor: { kind: "player" }, day: 0, kind: "buy", good: "grain", at, quantity: 5 });
    game.step();
    const afterBuy = game.snapshot();
    expect(afterBuy.player.cash).toBeLessThan(before);
    expect(afterBuy.player.stock.grain).toBeGreaterThanOrEqual(5);

    game.enqueue({ id: "s", actor: { kind: "player" }, day: 0, kind: "sell", good: "grain", at, quantity: 3 });
    game.step();
    const afterSell = game.snapshot();
    expect(afterSell.player.stock.grain).toBeLessThan(afterBuy.player.stock.grain);
    expect(afterSell.player.cash).toBeGreaterThan(afterBuy.player.cash);
  });

  test("commands execute in FIFO order within a day", () => {
    const game = createGame(3);
    const towns = game.snapshot().towns;
    const at = towns[0]!.id;
    // Sell before buying the same good: the sell finds no stock and fails first.
    game.enqueue({ id: "s", actor: { kind: "player" }, day: 0, kind: "sell", good: "iron", at, quantity: 2 });
    game.enqueue({ id: "b", actor: { kind: "player" }, day: 0, kind: "buy", good: "iron", at, quantity: 2 });
    game.step();
    const history = game.snapshot();
    expect(game.world.history.length).toBeGreaterThanOrEqual(2);
    expect(game.world.history[0]).toMatchObject({ kind: "trade-failed" });
    expect(game.world.history[1]).toMatchObject({ kind: "trade" });
    expect(history.player.stock.iron).toBe(2);
  });

  test("unimplemented commands record an outcome instead of crashing", () => {
    const game = createGame(4);
    game.enqueue({
      id: "u",
      actor: { kind: "player" },
      day: 0,
      kind: "unimplemented",
      label: "attempts to bribe the magistrate",
    });
    game.step();
    expect(game.world.history.some((o) => o.kind === "unimplemented")).toBe(true);
  });
});
