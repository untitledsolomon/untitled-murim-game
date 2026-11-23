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
}

export interface GoodsSnapshot {
  basePrice: number;
  market: Price;
  trend: number;
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

export interface PlayerSnapshot {
  personId: PersonId;
  name: string;
  age: number;
  background: string;
  location: TownId | null;
  cash: number;
  stock: Record<GoodId, number>;
  family: PersonSnapshot[];
}

export interface Snapshot {
  seed: number;
  day: DayNumber;
  player: PlayerSnapshot;
  counties: CountySnapshot[];
  towns: TownSnapshot[];
  organizations: OrganizationSnapshot[];
  goods: GoodDef[];
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
