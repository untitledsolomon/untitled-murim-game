import { DAYS_PER_YEAR } from "./constants";
import type { Rng } from "./rng";
import type {
  Command,
  CommandLogEntry,
  DayNumber,
  GoodId,
  OrganizationId,
  OrganizationKind,
  PersonId,
  TownId,
  Vector2,
  CountyId,
} from "./types";

export interface Person {
  id: PersonId;
  name: string;
  /** The day this person was born. Age is derived, never stored. */
  birthDay: DayNumber;
  /** Null when the person is not on the map (unknown, dead, or on the road). */
  location: TownId | null;
  /** The road journey this person is currently on, or null when standing still. */
  journey: Journey | null;
  /** Cash in hand. */
  wealth: number;
  /** Goods carried, keyed by good id. */
  stock: Record<GoodId, number>;
  /** Family relation to the player, when this person is family. */
  familyRole?: "spouse" | "child" | "parent";
}

/** A journey along roads, started with a travel command and completed in tick. */
export interface Journey {
  /** The town path, departure town first and destination last. */
  path: TownId[];
  /** Travel days of each leg, matching path[i] -> path[i + 1]. */
  legs: number[];
  departDay: DayNumber;
  arriveDay: DayNumber;
  /** Total road toll to pay on arrival. */
  toll: number;
}

export interface County {
  id: CountyId;
  name: string;
  isCapital: boolean;
  /** The county's grid cell, for borders and world placement. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface Town {
  id: TownId;
  countyId: CountyId;
  name: string;
  position: Vector2;
  magistrateId: PersonId;
  crime: number;
  unrest: number;
}

export interface Holding {
  id: string;
  good: GoodId;
  quantity: number;
}

export interface Organization {
  id: OrganizationId;
  name: string;
  kind: OrganizationKind;
  memberIds: PersonId[];
  holdings: Holding[];
  capabilities: OrganizationKind[];
  reputation: number;
  foundedDay: DayNumber;
  /** County this organization is based in, when known. */
  countyId?: CountyId;
}

export interface MarketEntry {
  /** Long-run price anchor for this good in this town. */
  base: number;
  /** Current drift as a fraction of the base price. */
  trend: number;
}

/** A road between two towns. Travel costs time and a toll. */
export interface Road {
  id: string;
  a: TownId;
  b: TownId;
  /** Straight-line length in world units. */
  length: number;
  /** Whole days to travel, ceil(length / ROAD_SPEED). */
  travelDays: number;
  /** One-time toll for using this road, from its length. */
  toll: number;
  status: "open" | "flooded";
}

export interface Outcome {
  day: DayNumber;
  /** The person who acted; null when the actor could not be resolved. */
  actorId: PersonId | null;
  text: string;
  kind: string;
}

export interface AlertState {
  id: string;
  day: DayNumber;
  severity: "info" | "warning" | "danger";
  text: string;
  kind: string;
}

export interface PlayerState {
  personId: PersonId;
  background: string;
  familyIds: PersonId[];
}

/**
 * The authoritative simulation state. Plain JSON-able data plus a live RNG.
 * The rng drives every random decision in the world, and its state is
 * serialized so an exact replay stays identical.
 */
export interface World {
  seed: number;
  day: DayNumber;
  counties: County[];
  towns: Town[];
  roads: Road[];
  organizations: Organization[];
  people: Record<PersonId, Person>;
  markets: Record<TownId, Record<GoodId, MarketEntry>>;
  player: PlayerState;
  /** Pending commands from the player and from AI, in submission order. */
  queue: Command[];
  /** Every command submitted through `Game.send`, for replay. Append-only. */
  commandLog: CommandLogEntry[];
  /** A full log of every command outcome the player may inspect. */
  history: Outcome[];
  /** Recent alerts for the feed. Newest first. */
  alerts: AlertState[];
  rng: Rng;
  /** Next counters, so ids stay unique across a run. */
  counters: {
    person: number;
    town: number;
    county: number;
    org: number;
    holding: number;
    alert: number;
    command: number;
    road: number;
  };
}

/** A person's age in whole years, derived from their birth day. */
export function ageOf(world: World, person: Person): number {
  return Math.max(0, Math.floor((world.day - person.birthDay) / DAYS_PER_YEAR));
}

export function makeAlert(world: World, severity: AlertState["severity"], text: string, kind: string): AlertState {
  const alert: AlertState = {
    id: `alert-${world.counters.alert++}`,
    day: world.day,
    severity,
    text,
    kind,
  };
  world.alerts.unshift(alert);
  if (world.alerts.length > 40) world.alerts.length = 40;
  return alert;
}

export function personStock(person: Person, good: GoodId): number {
  return person.stock[good] ?? 0;
}
