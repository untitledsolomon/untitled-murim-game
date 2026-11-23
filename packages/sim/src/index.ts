import { applyCommand } from "./actions";
import { buildSnapshot } from "./snapshot";
import { deserializeState, serializeState } from "./serialization";
import { stepDay } from "./tick";
import type { World } from "./state";
import type { Command, Snapshot, SnapshotOptions } from "./types";
import { generateWorld } from "./worldgen";

export type { World };
export * from "./types";
export * from "./constants";

/** A world plus the operations the rest of the program needs. */
export interface Game {
  seed: number;
  readonly world: World;
  /** Advance the simulation by one day. Safe to call many times. */
  step(): void;
  /** The UI-facing read of the current state. Pure and cheap. */
  snapshot(options?: SnapshotOptions): Snapshot;
  /**
   * The single entry point for commands, player or AI. A command that is
   * already due (`command.day <= world.day`) applies immediately, in
   * submission order, so a paused game reacts the instant the player acts.
   * A future-dated command is queued for its day. See also `enqueue`.
   */
  send(command: Command): void;
  /** Queue a command without applying it. Tests and the queue model use this. */
  enqueue(command: Command): void;
  serialize(): string;
  load(text: string): void;
}

/** Create a fresh world from a seed. The same seed always gives the same world. */
export function createWorld(seed: number): World {
  return generateWorld(seed);
}

/** The full game facade over a single world. */
export function createGame(seed: number): Game {
  const world = generateWorld(seed);
  return {
    get seed() {
      return world.seed;
    },
    get world() {
      return world;
    },
    step() {
      stepDay(world);
    },
    snapshot(options?: SnapshotOptions) {
      return buildSnapshot(world, options);
    },
    send(command: Command) {
      if (command.day <= world.day) {
        // Apply now, in submission order. Determinism is preserved because the
        // caller submits in this same order; the Phase 2 log records it.
        applyCommand(world, command);
      } else {
        world.queue.push(command);
      }
    },
    enqueue(command: Command) {
      world.queue.push(command);
    },
    serialize() {
      return serializeState(world);
    },
    load(text: string) {
      const loaded = deserializeState(text);
      copyWorld(world, loaded);
    },
  };
}

function copyWorld(target: World, source: World): void {
  Object.assign(target, source);
}
