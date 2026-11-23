import { marketPriceValue, sellPrice } from "./pricing";
import { personStock, type Person, type World } from "./state";
import type { ActorRef, Command, TownId } from "./types";

/** The command queue is a plain list; each command names the day it executes. */
export type Queue = Command[];

export function enqueue(world: World, command: Command): void {
  world.queue.push(command);
}

function recordOutcome(world: World, text: string, kind: string): void {
  world.history.push({ day: world.day, text, kind });
  if (world.history.length > 500) world.history.shift();
}

function playerPerson(world: World): Person {
  const person = world.people[world.player.personId];
  if (!person) throw new Error("Player person not found in world");
  return person;
}

/**
 * Resolve an actor reference to the person who acts. The player is their
 * person; a `person` actor is that person; an `organization` actor is its head
 * (first member). Same rules for everyone: validation must not depend on which
 * kind of actor issued the command.
 */
function resolveActorPerson(world: World, actor: ActorRef): Person {
  if (actor.kind === "player") return playerPerson(world);
  if (actor.kind === "person") {
    const person = world.people[actor.id];
    if (!person) throw new Error(`Unknown person ${actor.id}`);
    return person;
  }
  const org = world.organizations.find((o) => o.id === actor.id);
  const headId = org?.memberIds[0];
  const person = headId === undefined ? undefined : world.people[headId];
  if (!person) throw new Error(`Organization ${actor.id} has no head`);
  return person;
}

/** Fail a command with a typed outcome; no state is changed by the caller. */
function failOutcome(world: World, actorLabel: string, text: string, kind: "trade-failed" | "travel-failed"): void {
  recordOutcome(world, `${actorLabel} ${text}`, kind);
}

function validQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1;
}

/**
 * Apply one command to the world. Commands are the single shared interface
 * for the player and for AI. Every command validates against the resolved
 * actor first and records a typed failure outcome when it cannot run.
 */
export function applyCommand(world: World, command: Command): void {
  const actorLabel = actorLabelFor(world, command.actor);
  const person = resolveActorOrFail(world, command);
  if (person === null) return;

  switch (command.kind) {
    case "travel": {
      if (command.to === person.location) {
        failOutcome(world, actorLabel, `is already in ${townName(world, command.to)}.`, "travel-failed");
        break;
      }
      person.location = command.to;
      recordOutcome(world, `${actorLabel} travels to ${townName(world, command.to)}.`, "travel");
      break;
    }
    case "buy": {
      if (!validQuantity(command.quantity)) {
        failOutcome(world, actorLabel, `tried to buy an invalid quantity of ${command.good}.`, "trade-failed");
        break;
      }
      if (person.location !== command.at) {
        failOutcome(world, actorLabel, `cannot trade in ${townName(world, command.at)} from elsewhere.`, "trade-failed");
        break;
      }
      const price = marketPriceValue(world, command.at, command.good);
      const cost = price * command.quantity;
      if (cost > person.wealth) {
        failOutcome(world, actorLabel, `lacks cash to buy ${command.quantity} ${command.good}.`, "trade-failed");
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
      if (!validQuantity(command.quantity)) {
        failOutcome(world, actorLabel, `tried to sell an invalid quantity of ${command.good}.`, "trade-failed");
        break;
      }
      if (person.location !== command.at) {
        failOutcome(world, actorLabel, `cannot trade in ${townName(world, command.at)} from elsewhere.`, "trade-failed");
        break;
      }
      const held = personStock(person, command.good);
      const amount = Math.min(command.quantity, held);
      if (amount <= 0) {
        failOutcome(world, actorLabel, `has no ${command.good} to sell.`, "trade-failed");
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
  }
}

/**
 * Resolve the acting person, or record a typed failure when the actor no
 * longer exists. A bad actor reference must never crash a day step.
 */
function resolveActorOrFail(world: World, command: Command): Person | null {
  try {
    return resolveActorPerson(world, command.actor);
  } catch {
    const failureKind = command.kind === "travel" ? "travel-failed" : "trade-failed";
    failOutcome(world, actorLabelFor(world, command.actor), "cannot act: the actor is unknown.", failureKind);
    return null;
  }
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
