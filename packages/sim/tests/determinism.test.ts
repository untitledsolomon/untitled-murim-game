import { describe, expect, test } from "bun:test";
import { createGame } from "../src/index";
import type { Command } from "../src/types";

function runDays(seed: number, days: number, commands: Command[] = []): string {
  const game = createGame(seed);
  for (const command of commands) game.enqueue(command);
  for (let i = 0; i < days; i++) game.step();
  return game.serialize();
}

describe("determinism", () => {
  test("the same seed produces byte-identical state after 120 days", () => {
    expect(runDays(2026, 120)).toBe(runDays(2026, 120));
  });

  test("a different seed produces a different world", () => {
    expect(runDays(1, 120)).not.toBe(runDays(2, 120));
  });

  test("the same seed and command list replay to the same state", () => {
    // Resolve the town ids from the world itself, then replay with identical targets.
    const probe = createGame(4242);
    const towns = probe.snapshot().towns;
    const to = towns[1]!.id;
    const at = towns[0]!.id;
    const resolved: Command[] = [
      { id: "c1", actor: { kind: "player" }, day: 2, kind: "travel", to },
      { id: "c2", actor: { kind: "player" }, day: 5, kind: "buy", good: "grain", at, quantity: 4 },
    ];
    expect(runDays(4242, 120, resolved)).toBe(runDays(4242, 120, resolved));
  });

  test("pausing and resuming still produces the same state", () => {
    // Stepping in chunks is equivalent to stepping continuously.
    const full = runDays(31337, 90);
    const game = createGame(31337);
    for (let i = 0; i < 90; i++) {
      game.step();
      if (i < 45) game.snapshot(); // reading the snapshot must not perturb state
    }
    expect(game.serialize()).toBe(full);
  });
});
