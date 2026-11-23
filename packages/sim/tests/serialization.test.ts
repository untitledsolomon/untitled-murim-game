import { describe, expect, test } from "bun:test";
import { createGame } from "../src/index";

describe("serialization", () => {
  test("save and load round-trips the exact state", () => {
    const game = createGame(123);
    for (let i = 0; i < 30; i++) game.step();
    const saved = game.serialize();

    const fresh = createGame(999);
    fresh.load(saved);

    expect(fresh.serialize()).toBe(saved);
    expect(fresh.snapshot().day).toBe(game.snapshot().day);
  });

  test("a loaded game continues to simulate deterministically", () => {
    const game = createGame(456);
    for (let i = 0; i < 20; i++) game.step();
    const saved = game.serialize();

    // Continue the original, and continue a reloaded copy, for another 20 days.
    for (let i = 0; i < 20; i++) game.step();

    const copy = createGame(999);
    copy.load(saved);
    for (let i = 0; i < 20; i++) copy.step();

    expect(copy.serialize()).toBe(game.serialize());
  });

  test("unrelated saves from the same seed agree before divergence", () => {
    const a = createGame(777);
    const b = createGame(777);
    expect(a.serialize()).toBe(b.serialize());
    a.step();
    expect(a.serialize()).not.toBe(b.serialize());
  });
});
