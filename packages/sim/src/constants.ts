import type { GoodDef } from "./types";

/** Seven essential goods (design 7.1). Later goods are "nice to have". */
export const ESSENTIAL_GOODS: readonly GoodDef[] = [
  { id: "grain", name: "Grain", unit: "shi" },
  { id: "salt", name: "Salt", unit: "jin" },
  { id: "cloth", name: "Cloth", unit: "bolt" },
  { id: "tea", name: "Tea", unit: "catties" },
  { id: "iron", name: "Iron", unit: "jin" },
  { id: "medicine", name: "Medicine", unit: "package" },
  { id: "timber", name: "Timber", unit: "beam" },
] as const;

export const GOODS: GoodDef[] = [...ESSENTIAL_GOODS];

/** The display name of a good, shared by every module. */
export function goodLabel(goodId: string): string {
  return GOODS.find((good) => good.id === goodId)?.name ?? goodId;
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

/** Price trend bounds, as a fraction of the base price. */
export const TREND_MIN = -0.3;
export const TREND_MAX = 0.3;

/** How quickly a town's price trend drifts back toward zero per day. */
export const MEAN_REVERSION = 0.94;

/** Price movement noise per day, as a fraction of the base price. */
export const PRICE_NOISE = 0.02;

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
