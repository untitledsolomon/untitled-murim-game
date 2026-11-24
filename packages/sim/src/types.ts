// Public data contracts for the simulation.
// The UI binds only to these shapes, so the simulation can change underneath them.

export type WorldId = string;
export type CountyId = string;
export type TownId = string;
export type OrganizationId = string;
export type PersonId = string;
export type GoodId = string;

/** The simulation day, counting from day 0 at world creation. */
export type DayNumber = number;

export type Vector2 = [number, number];

export interface GoodDef {
  id: GoodId;
  name: string;
  unit: string;
  /** Weight in carry units, for the carry-capacity limit on travel. */
  weight: number;
  /** Units one person needs per year; drives town consumption. */
  perCapitaNeed: number;
  /** Essential goods always hold a baseline stock and shape unrest. */
  essential: boolean;
}

/** One contributor to an explainable number. Factors always sum to the value. */
export interface Factor {
  label: string;
  /** Contribution of this factor, in the same units as the value. */
  amount: number;
}

/**
 * Explainable number. The value is always the sum of its factors, so the UI
 * can show the value and, on hover, the reasons behind it.
 */
export interface Price {
  value: number;
  factors: Factor[];
}

export type OrganizationKind = "sect" | "merchant_house" | "bank" | "escort" | "government";

export type AlertSeverity = "info" | "warning" | "danger";

/* ---------- Snapshots (what the UI reads) ---------- */

export interface CountySnapshot {
  id: CountyId;
  name: string;
  isCapital: boolean;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** A road as the map reads it. `status` and `danger` are fog-gated in Phase 5. */
export interface RoadSnapshot {
  id: string;
  a: TownId;
  b: TownId;
  length: number;
  travelDays: number;
  toll: number;
  status: "open" | "flooded";
  /** Read-only danger of the road: average crime of the two endpoint towns. */
  danger: number;
}

export interface GoodsSnapshot {
  basePrice: number;
  market: Price;
  /** Units currently held in the town market. */
  stock: number;
  /** Target stock: days of consumption the market tries to hold. */
  target: number;
}

export interface TownSnapshot {
  id: TownId;
  countyId: CountyId;
  name: string;
  position: Vector2;
  magistrateId: PersonId;
  goods: Record<GoodId, GoodsSnapshot>;
  crime: number;
  unrest: number;
  influence: Price;
  known: boolean;
}

export interface MemberSnapshot {
  personId: PersonId;
  role: string;
  loyalty: number;
}

export interface HoldingSnapshot {
  good: GoodId;
  quantity: number;
  value: Price;
}

export interface OrganizationSnapshot {
  id: OrganizationId;
  name: string;
  kind: OrganizationKind;
  members: MemberSnapshot[];
  holdings: HoldingSnapshot[];
  capabilities: string[];
  reputation: Price;
  foundedDay: DayNumber;
}

export interface PersonSnapshot {
  id: PersonId;
  name: string;
  age: number;
  location: TownId | null;
  /** Relative to the player, when this person is family. */
  familyRole?: "spouse" | "child" | "parent";
}

export interface Measures {
  /** Cash plus the value of goods held. */
  wealth: Price;
  /** Grows with the size and reputation of the player's organizations. */
  influence: Price;
  /** Grows with public office and government connections. */
  power: Price;
}

export interface Alert {
  id: string;
  day: DayNumber;
  severity: AlertSeverity;
  text: string;
  kind: string;
}

export interface OutlinerItem {
  id: string;
  label: string;
  kind: string;
  priority: number;
}

export interface PlayerJourney {
  /** The destination town. */
  to: TownId;
  departDay: DayNumber;
  arriveDay: DayNumber;
  /** Total travel days of the route. */
  days: number;
  /** Days remaining until arrival, at this snapshot's day. */
  eta: number;
}

export interface PlayerSnapshot {
  personId: PersonId;
  name: string;
  age: number;
  background: string;
  location: TownId | null;
  /** World position, interpolated along the road when travelling. */
  position: Vector2;
  /** The road journey currently under way, or null. */
  journey: PlayerJourney | null;
  cash: number;
  stock: Record<GoodId, number>;
  family: PersonSnapshot[];
  /** The player's own recent outcomes, newest first. NPC activity is absent. */
  ledger: LedgerEntry[];
}

/** One entry in the player's book of own actions. */
export interface LedgerEntry {
  day: DayNumber;
  text: string;
  kind: string;
}

/** An active shock as the UI reads it. Fog-gated like any world fact in Phase 5. */
export interface ShockSnapshot {
  id: string;
  kind: "drought" | "good_harvest" | "flood" | "plague";
  /** Human label of the target: a county name, or the road's two towns. */
  targetLabel: string;
  startDay: DayNumber;
  endDay: DayNumber;
  /** Whole days until the shock clears. */
  daysLeft: number;
}

export interface Snapshot {
  seed: number;
  day: DayNumber;
  player: PlayerSnapshot;
  counties: CountySnapshot[];
  towns: TownSnapshot[];
  roads: RoadSnapshot[];
  organizations: OrganizationSnapshot[];
  goods: GoodDef[];
  /** Shocks still active in the world, oldest first. */
  shocks: ShockSnapshot[];
  measures: Measures;
  alerts: Alert[];
  outliner: OutlinerItem[];
}

/* ---------- Map modes and commands ---------- */

/** Options for building a snapshot. */
export interface SnapshotOptions {
  /**
   * When true, skip knowledge gating and reveal the whole world. Used by the
   * debug "Reveal all" toggle. Never serialized. Fog arrives in Phase 5, so
   * until then this flag is accepted but changes nothing.
   */
  revealAll?: boolean;
}

export type MapMode = "prices" | "crime" | "unrest" | "influence" | "knowledge";

/** Who issued a command. Player and AI use the same command system. */
export type ActorRef =
  | { kind: "player" }
  | { kind: "organization"; id: OrganizationId }
  | { kind: "person"; id: PersonId };

export interface CommandBase {
  id: string;
  actor: ActorRef;
  /** First day on or after which the command executes. */
  day: DayNumber;
}

export type Command =
  | (CommandBase & { kind: "travel"; to: TownId })
  | (CommandBase & { kind: "buy"; good: GoodId; at: TownId; quantity: number })
  | (CommandBase & { kind: "sell"; good: GoodId; at: TownId; quantity: number });

/**
 * The body of a command, without the id, actor, or execution day. The day is
 * optional and defaults to the current sim day, which makes it apply
 * immediately. `Game.send` fills in the id and day and logs the submission.
 */
export type CommandSpec =
  | ({ day?: DayNumber } & { kind: "travel"; to: TownId })
  | ({ day?: DayNumber } & { kind: "buy"; good: GoodId; at: TownId; quantity: number })
  | ({ day?: DayNumber } & { kind: "sell"; good: GoodId; at: TownId; quantity: number });

/** One submitted command as recorded for replay, in submission order. */
export interface CommandLogEntry {
  /** The sim day at submission time (world.day before the command runs). */
  day: DayNumber;
  /** Submission order, matching the number inside the command id. */
  order: number;
  /** The full command, including the assigned id and execution day. */
  command: Command;
}
