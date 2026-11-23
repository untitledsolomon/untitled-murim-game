import { applyCommand, recordOutcome } from "./actions";
import { goodLabel, TREND_MAX, TREND_MIN, MEAN_REVERSION, PRICE_NOISE } from "./constants";
import { rngGaussian } from "./rng";
import type { Person, World } from "./state";
import { makeAlert } from "./state";
import type { GoodId, TownId } from "./types";

/**
 * A system runs once per fixed tick. The ordered list below is where later
 * milestone systems (economy, AI, martial, family) slot in.
 */
export interface System {
  name: string;
  run(world: World): void;
}

function runDueCommands(world: World): void {
  const due: typeof world.queue = [];
  const pending: typeof world.queue = [];
  for (const command of world.queue) {
    if (command.day <= world.day) due.push(command);
    else pending.push(command);
  }
  world.queue = pending;
  for (const command of due) applyCommand(world, command);
}

/**
 * Complete journeys whose arrival day has come. Runs before commands, so a
 * traveller who arrives this morning can trade this noon.
 */
function runJourneys(world: World): void {
  for (const personId of Object.keys(world.people)) {
    const person = world.people[personId] as Person;
    const journey = person.journey;
    if (journey === null || journey === undefined) continue;
    if (world.day < journey.arriveDay) continue;
    const destination = journey.path[journey.path.length - 1]!;
    person.journey = null;
    person.location = destination;
    // Travellers pay the route toll on arrival; a toll can never send a
    // person into debt, so a traveller with no cash pays nothing.
    const toll = Math.min(journey.toll, person.wealth);
    if (toll > 0) {
      person.wealth -= toll;
      recordOutcome(
        world,
        personId,
        `${person.name} arrives in ${townName(world, destination)} and pays ${journey.toll.toFixed(1)} cash in tolls.`,
        "travel",
      );
    } else {
      recordOutcome(world, personId, `${person.name} arrives in ${townName(world, destination)}.`, "travel");
    }
  }
}

function driftPrices(world: World): void {
  const rng = world.rng;
  for (const town of world.towns) {
    for (const goodId of Object.keys(world.markets[town.id] ?? {})) {
      const entry = world.markets[town.id]?.[goodId] as { base: number; trend: number };
      const noise = rngGaussian(rng) * PRICE_NOISE;
      let trend = entry.trend * MEAN_REVERSION + noise;
      trend = Math.max(TREND_MIN, Math.min(TREND_MAX, trend));
      entry.trend = Math.round(trend * 1000) / 1000;
    }
  }
}

function driftSociety(world: World): void {
  const rng = world.rng;
  for (const town of world.towns) {
    town.crime = clamp01(town.crime + rngGaussian(rng) * 0.005);
    town.unrest = clamp01(town.unrest + rngGaussian(rng) * 0.005);
  }
  for (const org of world.organizations) {
    org.reputation = clamp(0, 100, org.reputation + rngGaussian(rng) * 0.4);
  }
}

// TODO(phase 5): replace this random alert emission with courier-delayed reports.
function emitAlerts(world: World): void {
  const threshold = 0.12;
  const rng = world.rng;
  for (const town of world.towns) {
    for (const goodId of Object.keys(world.markets[town.id] ?? {}) as GoodId[]) {
      const entry = world.markets[town.id]?.[goodId] as { base: number; trend: number };
      if (Math.abs(entry.trend) > threshold && rng.next() < 0.02) {
        const dir = entry.trend > 0 ? "rising" : "falling";
        makeAlert(
          world,
          Math.abs(entry.trend) > 0.2 ? "warning" : "info",
          `${goodLabel(goodId)} prices ${dir} sharply in ${town.name}.`,
          "prices",
        );
      }
    }
  }
  if (world.towns.some((t) => t.unrest > 0.5) && rng.next() < 0.02) {
    const hot = world.towns.find((t) => t.unrest > 0.5);
    if (hot) makeAlert(world, "danger", `Unrest is high in ${hot.name}.`, "unrest");
  }
}

/**
 * Advance the world by one day. Journeys that reached their destination run
 * first (travellers arrive before they act), then commands that are due run
 * in the order they were submitted, then every system observes the new day.
 */
export function stepDay(world: World): void {
  world.day += 1;
  for (const system of SYSTEMS) system.run(world);
}

/** The ordered systems that make up one tick. */
export const SYSTEMS: System[] = [
  { name: "travel", run: runJourneys },
  { name: "commands", run: runDueCommands },
  { name: "prices", run: driftPrices },
  { name: "society", run: driftSociety },
  { name: "alerts", run: emitAlerts },
];

function townName(world: World, townId: TownId): string {
  return world.towns.find((t) => t.id === townId)?.name ?? townId;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}
