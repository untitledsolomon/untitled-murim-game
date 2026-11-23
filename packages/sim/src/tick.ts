import { applyCommand, recordOutcome } from "./actions";
import {
  ALERT_GLUT_RATIO,
  ALERT_SCARCE_RATIO,
  goodLabel,
  GOODS,
  IMPORT_FLOOR_DAYS,
  SHORTAGE_RATIO,
  UNREST_CAP,
  UNREST_PER_SHORTAGE,
  UNREST_REVERT,
} from "./constants";
import { rngGaussian } from "./rng";
import type { Person, World } from "./state";
import { makeAlert, type MarketEntry } from "./state";
import type { GoodId, TownId } from "./types";

/**
 * A system runs once per fixed tick. The ordered list below is where later
 * milestone systems (AI, martial, family) slot in.
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

/**
 * The stock economy: each town's markets take in production and pay out
 * consumption every day, and the stock that remains sets the price. Surplus
 * towns accumulate (prices fall toward the floor), deficit towns deplete
 * (prices rise toward the ceiling). A small import floor keeps essential
 * markets above outright starvation, so one blocked road never empties a
 * town's granary forever.
 */
function runEconomy(world: World): void {
  for (const town of world.towns) {
    for (const good of GOODS) {
      const entry = world.markets[town.id]![good.id];
      let stock = entry.stock + entry.production - entry.dailyConsumption;
      if (stock < 0) stock = 0;
      const floor = good.essential ? entry.dailyConsumption * IMPORT_FLOOR_DAYS : 0;
      if (stock < floor) stock = floor;
      entry.stock = stock;
    }
  }
}

function runSociety(world: World): void {
  const rng = world.rng;
  for (const town of world.towns) {
    // Unrest is bounded and mean-reverting: shortages of essentials push it up,
    // restocked markets let it ease. This is the first link of the society
    // chain; crime and production cuts join in Phase 4b.
    let shortages = 0;
    for (const good of GOODS) {
      const entry = world.markets[town.id]![good.id];
      if (entry.stock < entry.target * SHORTAGE_RATIO) shortages++;
    }
    const desired = Math.min(UNREST_CAP, shortages * UNREST_PER_SHORTAGE);
    town.unrest = clamp01(town.unrest + (desired - town.unrest) * UNREST_REVERT);
    // Crime keeps its old random walk for now; a real chain replaces it in 4b.
    town.crime = clamp01(town.crime + rngGaussian(rng) * 0.005);
  }
  for (const org of world.organizations) {
    // Reputation keeps a slow random walk as a placeholder; a real system comes later.
    org.reputation = clamp(0, 100, org.reputation + rngGaussian(rng) * 0.4);
  }
}

// TODO(phase 5): replace this random alert emission with courier-delayed reports.
function emitAlerts(world: World): void {
  const rng = world.rng;
  for (const town of world.towns) {
    for (const goodId of Object.keys(world.markets[town.id] ?? {}) as GoodId[]) {
      const entry = world.markets[town.id]?.[goodId] as MarketEntry;
      const scarce = entry.stock < entry.target * ALERT_SCARCE_RATIO;
      const glut = entry.stock > entry.target * ALERT_GLUT_RATIO;
      if ((scarce || glut) && rng.next() < 0.02) {
        const severity = scarce && entry.stock < entry.target * ALERT_SCARCE_RATIO * 0.5 ? "warning" : "info";
        const text = scarce
          ? `${goodLabel(goodId)} scarce and dear in ${town.name}.`
          : `${goodLabel(goodId)} plentiful in ${town.name}.`;
        makeAlert(world, severity, text, "prices");
      }
    }
  }
  const hot = world.towns.find((t) => t.unrest > 0.5);
  if (hot && rng.next() < 0.02) makeAlert(world, "danger", `Unrest is high in ${hot.name}.`, "unrest");
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
  { name: "economy", run: runEconomy },
  { name: "society", run: runSociety },
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
