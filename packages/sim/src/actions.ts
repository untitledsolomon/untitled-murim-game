import { CARRY_CAPACITY, goodWeight } from "./constants";
import { shortestPath } from "./paths";
import { marketPriceValue, sellPrice } from "./pricing";
import { personStock, type Person, type World } from "./state";
import type { ActorRef, Command, CommandSpec, PersonId, TownId } from "./types";

export function recordOutcome(world: World, actorId: PersonId | null, text: string, kind: string): void {
  world.history.push({ day: world.day, actorId, text, kind });
  if (world.history.length > 500) world.history.shift();
}

/** Total weight of everything a person carries, in carry units. */
function weightInUse(person: Person): number {
  return Object.entries(person.stock).reduce((sum, [good, quantity]) => sum + goodWeight(good) * quantity, 0);
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
function failOutcome(
  world: World,
  actorId: PersonId | null,
  actorLabel: string,
  text: string,
  kind: "trade-failed" | "travel-failed",
): void {
  recordOutcome(world, actorId, `${actorLabel} ${text}`, kind);
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
        failOutcome(world, person.id, actorLabel, `is already in ${townName(world, command.to)}.`, "travel-failed");
        break;
      }
      if (person.journey !== null) {
        failOutcome(world, person.id, actorLabel, "is already on the road and cannot change route.", "travel-failed");
        break;
      }
      const from = person.location;
      if (from === null) {
        failOutcome(world, person.id, actorLabel, "cannot start a journey from the roadside.", "travel-failed");
        break;
      }
      const plan = shortestPath(world, from, command.to);
      if (plan === null) {
        failOutcome(world, person.id, actorLabel, `has no open route to ${townName(world, command.to)}.`, "travel-failed");
        break;
      }
      person.location = null;
      person.journey = {
        path: plan.path,
        legs: plan.legs,
        departDay: world.day,
        arriveDay: world.day + plan.days,
        toll: plan.toll,
      };
      recordOutcome(
        world,
        person.id,
        `${actorLabel} sets out for ${townName(world, command.to)}, a ${plan.days}-day journey.`,
        "travel",
      );
      break;
    }
    case "buy": {
      if (!validQuantity(command.quantity)) {
        failOutcome(world, person.id, actorLabel, `tried to buy an invalid quantity of ${command.good}.`, "trade-failed");
        break;
      }
      if (person.location !== command.at) {
        failOutcome(world, person.id, actorLabel, `cannot trade in ${townName(world, command.at)} from elsewhere.`, "trade-failed");
        break;
      }
      const capacityLeft = CARRY_CAPACITY - weightInUse(person);
      const maxQuantity = Math.floor(capacityLeft / goodWeight(command.good));
      if (command.quantity > maxQuantity) {
        failOutcome(
          world,
          person.id,
          actorLabel,
          `cannot carry ${command.quantity} ${command.good}: the load would exceed the carry limit.`,
          "trade-failed",
        );
        break;
      }
      const price = marketPriceValue(world, command.at, command.good);
      const cost = price * command.quantity;
      if (cost > person.wealth) {
        failOutcome(world, person.id, actorLabel, `lacks cash to buy ${command.quantity} ${command.good}.`, "trade-failed");
        break;
      }
      person.wealth -= cost;
      person.stock[command.good] = personStock(person, command.good) + command.quantity;
      recordOutcome(
        world,
        person.id,
        `${actorLabel} buys ${command.quantity} ${command.good} at ${townName(world, command.at)} for ${cost.toFixed(1)} cash.`,
        "trade",
      );
      break;
    }
    case "sell": {
      if (!validQuantity(command.quantity)) {
        failOutcome(world, person.id, actorLabel, `tried to sell an invalid quantity of ${command.good}.`, "trade-failed");
        break;
      }
      if (person.location !== command.at) {
        failOutcome(world, person.id, actorLabel, `cannot trade in ${townName(world, command.at)} from elsewhere.`, "trade-failed");
        break;
      }
      const held = personStock(person, command.good);
      const amount = Math.min(command.quantity, held);
      if (amount <= 0) {
        failOutcome(world, person.id, actorLabel, `has no ${command.good} to sell.`, "trade-failed");
        break;
      }
      const price = sellPrice(world, command.at, command.good).value;
      const gains = price * amount;
      person.stock[command.good] = held - amount;
      person.wealth += gains;
      recordOutcome(
        world,
        person.id,
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
    // The actor could not be resolved, so there is no person to credit. The
    // null actorId never matches the player, keeping the ledger honest.
    failOutcome(world, null, actorLabelFor(world, command.actor), "cannot act: the actor is unknown.", failureKind);
    return null;
  }
}

/**
 * Strip a full command back to the spec a caller would submit, so a recorded
 * command can be submitted again through `Game.send` (replay).
 */
export function commandSpec(command: Command): CommandSpec {
  switch (command.kind) {
    case "travel":
      return { kind: "travel", to: command.to, day: command.day };
    case "buy":
      return { kind: "buy", good: command.good, at: command.at, quantity: command.quantity, day: command.day };
    case "sell":
      return { kind: "sell", good: command.good, at: command.at, quantity: command.quantity, day: command.day };
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
