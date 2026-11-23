import type { GoodDef } from "./types";

/** Seven essential goods (design 7.1). Later goods are "nice to have". */
export const ESSENTIAL_GOODS: readonly GoodDef[] = [
  { id: "grain", name: "Grain", unit: "shi", weight: 1.0, perCapitaNeed: 1.0, essential: true },
  { id: "salt", name: "Salt", unit: "jin", weight: 0.8, perCapitaNeed: 0.2, essential: true },
  { id: "cloth", name: "Cloth", unit: "bolt", weight: 0.5, perCapitaNeed: 0.4, essential: true },
  { id: "tea", name: "Tea", unit: "catties", weight: 0.4, perCapitaNeed: 0.15, essential: true },
  { id: "iron", name: "Iron", unit: "jin", weight: 1.5, perCapitaNeed: 0.1, essential: true },
  { id: "medicine", name: "Medicine", unit: "package", weight: 0.3, perCapitaNeed: 0.2, essential: true },
  { id: "timber", name: "Timber", unit: "beam", weight: 2.0, perCapitaNeed: 0.4, essential: true },
] as const;

export const GOODS: GoodDef[] = [...ESSENTIAL_GOODS];

/** The display name of a good, shared by every module. */
export function goodLabel(goodId: string): string {
  return GOODS.find((good) => good.id === goodId)?.name ?? goodId;
}

/** The weight (in carry units) of one unit of a good, for carry limits. */
export function goodWeight(goodId: string): number {
  return GOODS.find((good) => good.id === goodId)?.weight ?? 1;
}

/** Default reference base price per good, in copper cash. Towns vary from this. */
export const BASE_PRICES: Record<string, number> = {
  grain: 2,
  salt: 4,
  cloth: 8,
  tea: 20,
  iron: 15,
  medicine: 12,
  timber: 6,
};

/** World is a square of this many world units. */
export const WORLD_SIZE = 220;

export const COUNTY_GRID = 2; // square counties per side
export const COUNTY_COUNT = COUNTY_GRID * COUNTY_GRID;
export const TOWNS_PER_COUNTY = 4;

export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_MONTH = 30;
export const DAYS_PER_YEAR = MONTHS_PER_YEAR * DAYS_PER_MONTH;

/** Starting wealth for the player's character, in cash. */
export const STARTING_CASH = 200;

/** World units a person covers in one full travel day on a road. */
export const ROAD_SPEED = 12;

/** Road toll in cash per world unit of road length. */
export const TOLL_PER_UNIT = 0.2;

/** Weight units one person can carry at once, across all goods. */
export const CARRY_CAPACITY = 60;

/** How far one town's base price may drift from the global base, ±5%. */
export const BASE_TRANSPORT_OFFSET = 0.05;

/** How strongly the price responds to running below or above target stock. */
export const STOCK_RESPONSE = 2.0;

/** Price bounds as a multiplier on the base price, from the model. */
export const PRICE_FLOOR = 0.4;
export const PRICE_CEIL = 3.0;

/** A town's target stock: this many days of local consumption held in reserve. */
export const DAILY_TARGET_DAYS = 30;

/** The sell penalty, as a fraction of the buy price, own factor. */
export const TRADE_SPREAD = 0.05;

/** Baseline provision: a town always holds at least this many days of stock. */
export const IMPORT_FLOOR_DAYS = 3;

/** How much of their own consumption a county produces for widespread goods. */
export const COUNTY_SELF_SUFFICIENCY = 1.15;

/** How much of the whole country's consumption scarce goods are produced at. */
export const SCARCE_SUPPLY_FACTOR = 1.3;

/** Town population bounds, drawn per town at worldgen. */
export const POPULATION_MIN = 300;
export const POPULATION_MAX = 1200;

/** A town is "short" of a good when its stock falls below this share of target. */
export const SHORTAGE_RATIO = 0.5;

/** Unrest from shortages: pushes toward UNREST_CAP, mean-reverting. */
export const UNREST_CAP = 0.6;
export const UNREST_PER_SHORTAGE = 0.1;
export const UNREST_REVERT = 0.05;

/** Stock-based price-alert thresholds, as shares of target. */
export const ALERT_SCARCE_RATIO = 0.3;
export const ALERT_GLUT_RATIO = 1.8;

/**
 * Where each good is produced. Widespread goods come from every town in
 * varying amounts; scarce goods come from a small fixed number of specialist
 * towns, so the rest of the country must buy them in. Production rates are
 * sized against actual populations at worldgen (see docs/decisions.md).
 */
export interface GoodScheme {
  kind: "widespread" | "scarce";
  /** For scarce goods: how many towns in the country produce the good. */
  producers?: number;
}

export const GOOD_SCHEMES: Record<string, GoodScheme> = {
  grain: { kind: "widespread" },
  cloth: { kind: "widespread" },
  salt: { kind: "scarce", producers: 4 },
  tea: { kind: "scarce", producers: 3 },
  iron: { kind: "scarce", producers: 3 },
  medicine: { kind: "scarce", producers: 3 },
  timber: { kind: "scarce", producers: 4 },
};

/** Default days of simulation per real second. */
export const BASE_DAYS_PER_SECOND = 0.5;

/** Maximum days simulated in one engine frame, to keep the world responsive. */
export const MAX_DAYS_PER_FRAME = 4;

export const CALENDAR_LABELS = [
  "First Moon",
  "Second Moon",
  "Third Moon",
  "Fourth Moon",
  "Fifth Moon",
  "Sixth Moon",
  "Seventh Moon",
  "Eighth Moon",
  "Ninth Moon",
  "Tenth Moon",
  "Eleventh Moon",
  "Twelfth Moon",
];
