import { applyCommand } from "./actions";
import type { World } from "./state";
import type { ActorRef, Command, CommandSpec } from "./types";

/** Build a command from a spec, assigning its id from the shared counter. */
export function buildCommand(world: World, actor: ActorRef, spec: CommandSpec): Command {
  const day = spec.day ?? world.day;
  const id = `cmd-${world.counters.command++}`;
  if (spec.kind === "travel") return { id, actor, day, kind: "travel", to: spec.to };
  if (spec.kind === "buy") return { id, actor, day, kind: "buy", good: spec.good, at: spec.at, quantity: spec.quantity };
  return { id, actor, day, kind: "sell", good: spec.good, at: spec.at, quantity: spec.quantity };
}

function orderOf(command: Command): number {
  return Number(command.id.slice("cmd-".length));
}

/**
 * The single command submission path, shared by the player front door
 * `Game.send` and the internal trader system. An entry is appended to
 * `world.commandLog` only when `log` is true:
 *
 *  - Host submissions (the player and anything the app sends) are logged, so
 *    the log replays them exactly.
 *  - Commands the simulation generates itself during a day step (NPC traders)
 *    are not logged: stepping already reproduces them deterministically, and
 *    logging them would make a log replay apply each trade twice.
 *
 * A command already due (`command.day <= world.day`) applies immediately, in
 * submission order; one dated in the future is queued for its day.
 */
export function submitCommand(world: World, actor: ActorRef, spec: CommandSpec, log = true): Command {
  const command = buildCommand(world, actor, spec);
  if (log) world.commandLog.push({ day: world.day, order: orderOf(command), command });
  if (command.day <= world.day) {
    applyCommand(world, command);
  } else {
    world.queue.push(command);
  }
  return command;
}
