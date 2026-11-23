import { DAYS_PER_YEAR } from "./constants";
import type { Rng } from "./rng";
import type {
  Command,
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
  /** Null when the person is not on the map (unknown or dead). */
  location: TownId | null;
  /** Cash in hand. */
  wealth: number;
  /** Goods carried, keyed by good id. */
  stock: Record<GoodId, number>;
  /** Family relation to the player, when this person is family. */
  familyRole?: "spouse" | "child" | "parent";
}

export interface County {
  id: CountyId;
  name: string;
  isCapital: boolean;
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

export interface Outcome {
  day: DayNumber;
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
  organizations: Organization[];
  people: Record<PersonId, Person>;
  markets: Record<TownId, Record<GoodId, MarketEntry>>;
  player: PlayerState;
  /** Pending commands from the player and from AI, in submission order. */
  queue: Command[];
  /** A full log of every command outcome the player may inspect. */
  history: Outcome[];
  /** Recent alerts for the feed. Newest first. */
  alerts: AlertState[];
  rng: Rng;
  /** Next counters, so ids stay unique across a run. */
  counters: { person: number; town: number; county: number; org: number; holding: number; alert: number; command: number };
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
