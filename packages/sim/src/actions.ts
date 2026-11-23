import { marketPriceValue, sellPrice } from "./pricing";
import { makeAlert, personStock, type World } from "./state";
import type { ActorRef, Command, GoodId, TownId } from "./types";

/** The command queue is a plain list; each command names the day it executes. */
export type Queue = Command[];

export function enqueue(world: World, command: Command): void {
  world.queue.push(command);
}

function recordOutcome(world: World, text: string, kind: string): void {
  world.history.push({ day: world.day, text, kind });
  if (world.history.length > 500) world.history.shift();
}

function playerPerson(world: World) {
  const person = world.people[world.player.personId];
  if (!person) throw new Error("Player person not found in world");
  return person;
}

/**
 * Apply one command to the world. Commands are the single shared interface
 * for the player and for AI. Unimplemented kinds still record an outcome, so
 * every command is visible and testable rather than silently dropped.
 */
export function applyCommand(world: World, command: Command): void {
  const actorLabel = actorLabelFor(world, command.actor);
  let targetTown: TownId | null = null;

  switch (command.kind) {
    case "travel": {
      const person = playerPerson(world);
      person.location = command.to;
      targetTown = command.to;
      recordOutcome(world, `${actorLabel} travels to ${townName(world, command.to)}.`, "travel");
      break;
    }
    case "buy": {
      const person = playerPerson(world);
      const price = marketPriceValue(world, command.at, command.good);
      const cost = price * command.quantity;
      if (cost > person.wealth) {
        recordOutcome(world, `${actorLabel} lacks cash to buy ${command.quantity} ${command.good}.`, "trade-failed");
        break;
      }
      person.wealth -= cost;
      person.stock[command.good] = personStock(person, command.good) + command.quantity;
      recordOutcome(
        world,
        `${actorLabel} buys ${command.quantity} ${command.good} at ${townName(world, command.at)} for ${cost.toFixed(1)} cash.`,
        "trade",
      );
      break;
    }
    case "sell": {
      const person = playerPerson(world);
      const held = personStock(person, command.good);
      const amount = Math.min(command.quantity, held);
      if (amount <= 0) {
        recordOutcome(world, `${actorLabel} has no ${command.good} to sell.`, "trade-failed");
        break;
      }
      const price = sellPrice(world, command.at, command.good).value;
      const gains = price * amount;
      person.stock[command.good] = held - amount;
      person.wealth += gains;
      recordOutcome(
        world,
        `${actorLabel} sells ${amount} ${command.good} at ${townName(world, command.at)} for ${gains.toFixed(1)} cash.`,
        "trade",
      );
      break;
    }
    case "found_organization": {
      targetTown = command.at;
      // The organization itself is created by worldgen; founding is recorded here.
      recordOutcome(world, `${actorLabel} begins founding an organization at ${townName(world, command.at)}.`, "founding");
      makeAlert(world, "info", `Founding work started at ${townName(world, command.at)}.`, "founding");
      break;
    }
    case "influence":
      recordOutcome(world, `${actorLabel} works to influence a rival organization: ${command.label}.`, "influence");
      break;
    case "unimplemented":
      recordOutcome(world, `${actorLabel} ${command.label} (not yet implemented).`, "unimplemented");
      break;
  }

  void targetTown;
}

function actorLabelFor(world: World, actor: ActorRef): string {
  switch (actor.kind) {
    case "player": {
      const person = world.people[world.player.personId];
      return person ? person.name : "The player";
    }
    case "organization": {
      const org = world.organizations.find((o) => o.id === actor.id);
      return org ? org.name : "An organization";
    }
    case "person": {
      const person = world.people[actor.id];
      return person ? person.name : "Someone";
    }
  }
}

function townName(world: World, townId: TownId): string {
  return world.towns.find((t) => t.id === townId)?.name ?? townId;
}
