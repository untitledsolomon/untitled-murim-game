import { applyCommand, commandSpec } from "./actions";
import { buildSnapshot } from "./snapshot";
import { deserializeState, serializeState } from "./serialization";
import { stepDay } from "./tick";
import type { World } from "./state";
import type { ActorRef, Command, CommandSpec, Snapshot, SnapshotOptions } from "./types";
import { generateWorld } from "./worldgen";

export type { World };
export * from "./types";
export * from "./constants";
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
   * The single entry point for commands, player or AI. Assigns the command id,
   * defaults the execution day to today, and records the submission in
   * `world.commandLog` for replay. A command that is already due
   * (`command.day <= world.day`) applies immediately, in submission order, so
   * a paused game reacts the instant the actor acts. A future-dated command is
   * queued and runs when its day arrives. Returns the assigned command.
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
      const command = buildCommand(world, actor, spec);
      world.commandLog.push({ day: world.day, order: orderOf(command), command });
      if (command.day <= world.day) {
        applyCommand(world, command);
      } else {
        world.queue.push(command);
      }
      return command;
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

/** Number the command from the shared counter; the id embeds the order. */
function buildCommand(world: World, actor: ActorRef, spec: CommandSpec): Command {
  const day = spec.day ?? world.day;
  const id = `cmd-${world.counters.command++}`;
  if (spec.kind === "travel") return { id, actor, day, kind: "travel", to: spec.to };
  if (spec.kind === "buy") return { id, actor, day, kind: "buy", good: spec.good, at: spec.at, quantity: spec.quantity };
  return { id, actor, day, kind: "sell", good: spec.good, at: spec.at, quantity: spec.quantity };
}

function orderOf(command: Command): number {
  return Number(command.id.slice("cmd-".length));
}

function copyWorld(target: World, source: World): void {
  Object.assign(target, source);
}
