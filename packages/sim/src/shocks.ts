import {
  DROUGHT_GRAIN_SCALE,
  DROUGHT_MAX_DAYS,
  DROUGHT_MIN_DAYS,
  FLOOD_MAX_DAYS,
  FLOOD_MIN_DAYS,
  HARVEST_GRAIN_SCALE,
  HARVEST_MAX_DAYS,
  HARVEST_MIN_DAYS,
  PLAGUE_MAX_DAYS,
  PLAGUE_MIN_DAYS,
  PLAGUE_NEED_SCALE,
  SHOCK_DROUGHT_CHANCE,
  SHOCK_FLOOD_CHANCE,
  SHOCK_HARVEST_CHANCE,
  SHOCK_PLAGUE_CHANCE,
} from "./constants";
import { rngInt, rngPick } from "./rng";
import { makeAlert, type Shock, type World } from "./state";
import type { CountyId, GoodId } from "./types";

/**
 * One seeded draw per shock kind per day decides whether a new shock begins,
 * and where. Drought and a good harvest scale a whole county's grain; plague
 * spikes a county's medicine need; a flood closes a specific road until it
 * clears. Expired shocks are culled each day, so `world.shocks` holds only the
 * shocks that are live right now.
 */
export function runShocks(world: World): void {
  // Cull shocks that have ended, then reopen any road whose last flood is gone.
  world.shocks = world.shocks.filter((shock) => shock.endDay >= world.day);
  for (const road of world.roads) {
    if (road.status !== "flooded") continue;
    const stillFlooded = world.shocks.some(
      (shock) => shock.kind === "flood" && shock.targetId === road.id && shock.endDay >= world.day,
    );
    if (!stillFlooded) road.status = "open";
  }

  maybeSpawn(world, "drought", SHOCK_DROUGHT_CHANCE);
  maybeSpawn(world, "good_harvest", SHOCK_HARVEST_CHANCE);
  maybeSpawn(world, "flood", SHOCK_FLOOD_CHANCE);
  maybeSpawn(world, "plague", SHOCK_PLAGUE_CHANCE);
}

function maybeSpawn(world: World, kind: Shock["kind"], chance: number): void {
  if (world.rng.next() >= chance) return;
  spawnShock(world, kind);
}

function spawnShock(world: World, kind: Shock["kind"]): void {
  const rng = world.rng;
  let targetId: string;
  let durationMin: number;
  let durationMax: number;
  if (kind === "flood") {
    targetId = rngPick(rng, world.roads).id;
    durationMin = FLOOD_MIN_DAYS;
    durationMax = FLOOD_MAX_DAYS;
  } else {
    targetId = rngPick(rng, world.counties).id;
    if (kind === "drought") {
      durationMin = DROUGHT_MIN_DAYS;
      durationMax = DROUGHT_MAX_DAYS;
    } else if (kind === "good_harvest") {
      durationMin = HARVEST_MIN_DAYS;
      durationMax = HARVEST_MAX_DAYS;
    } else {
      durationMin = PLAGUE_MIN_DAYS;
      durationMax = PLAGUE_MAX_DAYS;
    }
  }

  const shock: Shock = {
    id: `shock-${world.counters.shock++}`,
    kind,
    targetId,
    startDay: world.day,
    endDay: world.day + rngInt(rng, durationMin, durationMax + 1),
  };
  world.shocks.push(shock);

  if (kind === "flood") {
    const road = world.roads.find((r) => r.id === targetId);
    if (road) {
      road.status = "flooded";
      makeAlert(
        world,
        "danger",
        `Flooding closes the road between ${townName(world, road.a)} and ${townName(world, road.b)}.`,
        "shock",
      );
    }
    return;
  }
  const county = world.counties.find((c) => c.id === targetId);
  if (!county) return;
  if (kind === "drought") makeAlert(world, "warning", `Drought grips ${county.name}: the grain harvest withers.`, "shock");
  else if (kind === "good_harvest") makeAlert(world, "info", `A good harvest fills the granaries of ${county.name}.`, "shock");
  else makeAlert(world, "warning", `Plague sweeps ${county.name}: demand for medicine doubles.`, "shock");
}

/**
 * Which counties are currently hit by each county-wide shock, as sets for the
 * economy system to test per town. Rebuilt once per day step.
 */
export function activeShockCounties(world: World): {
  drought: Set<CountyId>;
  harvest: Set<CountyId>;
  plague: Set<CountyId>;
} {
  const drought = new Set<CountyId>();
  const harvest = new Set<CountyId>();
  const plague = new Set<CountyId>();
  for (const shock of world.shocks) {
    if (shock.endDay < world.day) continue;
    if (shock.kind === "drought") drought.add(shock.targetId as CountyId);
    else if (shock.kind === "good_harvest") harvest.add(shock.targetId as CountyId);
    else if (shock.kind === "plague") plague.add(shock.targetId as CountyId);
  }
  return { drought, harvest, plague };
}

/** Effective production and consumption scales a shock imposes on a good. */
export function shockScales(
  counties: ReturnType<typeof activeShockCounties>,
  countyId: CountyId,
  goodId: GoodId,
): { productionScale: number; consumptionScale: number } {
  let productionScale = 1;
  let consumptionScale = 1;
  if (goodId === "grain") {
    if (counties.drought.has(countyId)) productionScale *= DROUGHT_GRAIN_SCALE;
    if (counties.harvest.has(countyId)) productionScale *= HARVEST_GRAIN_SCALE;
  } else if (goodId === "medicine" && counties.plague.has(countyId)) {
    consumptionScale = PLAGUE_NEED_SCALE;
  }
  return { productionScale, consumptionScale };
}

function townName(world: World, townId: string): string {
  return world.towns.find((t) => t.id === townId)?.name ?? townId;
}
