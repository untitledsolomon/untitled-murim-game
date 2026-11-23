import { buildSnapshot } from "./snapshot";
import { deserializeState, serializeState } from "./serialization";
import { stepDay } from "./tick";
import type { World } from "./state";
import type { Command, Snapshot } from "./types";
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
  snapshot(): Snapshot;
  /** Queue a command, for the player or for AI. */
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
    snapshot() {
      return buildSnapshot(world);
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
