import { commandSpec } from "./actions";
import { submitCommand } from "./commands";
import { buildSnapshot } from "./snapshot";
import { deserializeState, serializeState } from "./serialization";
import { stepDay } from "./tick";
import type { World } from "./state";
import type { ActorRef, Command, CommandSpec, Snapshot, SnapshotOptions } from "./types";
import { generateWorld } from "./worldgen";

export type { World };
export * from "./types";
export * from "./constants";
export * from "./paths";
export * from "./pricing";
export * from "./npc";
export { commandSpec };

/** A world plus the operations the rest of the program needs. */
export interface Game {
  seed: number;
  readonly world: World;
  /** Advance the simulation by one day. Safe to call many times. */
  step(): void;
  /** The UI-facing read of the current state. Pure and cheap. */
  snapshot(options?: SnapshotOptions): Snapshot;
  /**
   * The single entry point for commands from the app, player or AI. Assigns
   * the command id, defaults the execution day to today, and records the
   * submission in `world.commandLog` for replay, so a recorded log replays
   * byte-identically. A command already due (`command.day <= world.day`)
   * applies immediately, in submission order; a future-dated command is queued
   * for its day. NPC traders act through the same path inside the daily tick
   * (see `submitCommand` in commands.ts).
   */
  send(actor: ActorRef, spec: CommandSpec): Command;
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
    send(actor: ActorRef, spec: CommandSpec) {
      return submitCommand(world, actor, spec);
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
