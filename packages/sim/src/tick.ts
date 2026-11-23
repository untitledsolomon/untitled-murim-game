import { applyCommand } from "./actions";
import { TREND_MAX, TREND_MIN, MEAN_REVERSION, PRICE_NOISE } from "./constants";
import { rngGaussian } from "./rng";
import { makeAlert, type World } from "./state";
import type { GoodId } from "./types";

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
 * Advance the world by one day. Commands that are due run first, in the
 * order they were submitted, then every system observes the new day.
 */
export function stepDay(world: World): void {
  world.day += 1;
  for (const system of SYSTEMS) system.run(world);
}

/** The ordered systems that make up one tick. */
export const SYSTEMS: System[] = [
  { name: "commands", run: runDueCommands },
  { name: "prices", run: driftPrices },
  { name: "society", run: driftSociety },
  { name: "alerts", run: emitAlerts },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function goodLabel(goodId: GoodId): string {
  const words: Record<string, string> = {
    grain: "Grain",
    salt: "Salt",
    cloth: "Cloth",
    tea: "Tea",
    iron: "Iron",
    medicine: "Medicine",
    timber: "Timber",
  };
  return words[goodId] ?? goodId;
}
