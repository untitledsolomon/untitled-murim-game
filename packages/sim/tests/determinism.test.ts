import { describe, expect, test } from "bun:test";
import { commandSpec, createGame } from "../src/index";
import type { CommandSpec } from "../src/types";

function runDays(seed: number, days: number, spec: (game: ReturnType<typeof createGame>) => CommandSpec[] = () => []): string {
  const game = createGame(seed);
  for (const command of spec(game)) game.send({ kind: "player" }, command);
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
    const commands: CommandSpec[] = [
      { kind: "travel", to, day: 2 },
      { kind: "buy", good: "grain", at, quantity: 4, day: 5 },
    ];
    expect(runDays(4242, 120, () => commands)).toBe(runDays(4242, 120, () => commands));
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

  test("commands record a replay log and replay byte-identically", () => {
    // Recorded (day, order, command) log from one run reproduces the same
    // state when replayed on a fresh world, because ids, days, and submission
    // order all come from the same deterministic counters.
    const seed = 9001;
    const a = createGame(seed);
    const at = a.snapshot().player.location!;
    a.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 3 });
    a.send({ kind: "player" }, { kind: "travel", to: a.snapshot().towns.find((t) => t.id !== at)!.id, day: 4 });
    for (let i = 0; i < 40; i++) a.step();

    const log = a.world.commandLog;
    expect(log.length).toBe(2);
    expect(log.map((entry) => entry.command.id)).toEqual(["cmd-0", "cmd-1"]);
    expect(log[0]!.order).toBe(0);

    // Replay the recorded log verbatim through `send`, then step identically.
    const b = createGame(seed);
    for (const entry of log) b.send(entry.command.actor, commandSpec(entry.command));
    for (let i = 0; i < 40; i++) b.step();
    expect(b.serialize()).toBe(a.serialize());
  });

  test("the same commands at different frame cadences are byte-identical", () => {
    // Command days are explicit and commands apply at send time when due; how
    // the app chunks `step()` across frames must be irrelevant to the final
    // state. Both runs submit the exact same commands on the same sim days.
    const seed = 618034;
    const submit = (game: ReturnType<typeof createGame>): void => {
      const at = game.snapshot().player.location!;
      const to = game.snapshot().towns.find((t) => t.id !== at)!.id;
      game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 2 });
      game.send({ kind: "player" }, { kind: "travel", to, day: 3 });
      game.send({ kind: "player" }, { kind: "sell", good: "grain", at, quantity: 1, day: 6 });
      game.send({ kind: "player" }, { kind: "buy", good: "tea", at: to, quantity: 1, day: 9 });
    };

    // Cadence A: one step per frame, like a fast engine loop.
    const a = createGame(seed);
    submit(a);
    for (let i = 0; i < 60; i++) a.step();

    // Cadence B: the same commands, but steps come in uneven bursts of whole
    // days, like a slow or laggy frame loop.
    const b = createGame(seed);
    submit(b);
    for (const chunk of [7, 13, 19, 21]) {
      for (let i = 0; i < chunk; i++) b.step();
    }

    expect(b.serialize()).toBe(a.serialize());
  });
});
