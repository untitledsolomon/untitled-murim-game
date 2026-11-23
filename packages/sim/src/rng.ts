// Deterministic pseudo-random number generator (mulberry32).
// The world must never use Math.random, so the same seed always gives the same world.

export interface Rng {
  /** Current 32-bit generator state. Serialized with the world for exact replay. */
  state: number;
  /** Next value in [0, 1). */
  next(): number;
}

/** Mulberry32 PRNG. Seed is a 32-bit integer. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const rng: Rng = {
    get state() {
      return state;
    },
    set state(value: number) {
      state = value >>> 0;
    },
    next(): number {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
  return rng;
}

/** Random integer in [min, max), for min < max. */
export function rngInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng.next() * (max - min)) + min;
}

/** Random number in [min, max). */
export function rngRange(rng: Rng, min: number, max: number): number {
  return rng.next() * (max - min) + min;
}

/** Random element of a non-empty array. */
export function rngPick<T>(rng: Rng, values: readonly T[]): T {
  return values[rngInt(rng, 0, values.length)] as T;
}

/** Returns a new array with the elements in random order. */
export function rngShuffle<T>(rng: Rng, values: readonly T[]): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rngInt(rng, 0, i + 1);
    const swap = out[i] as T;
    out[i] = out[j] as T;
    out[j] = swap;
  }
  return out;
}

/** Gaussian value, roughly in [-1, 1], via the sum of a few uniform draws. */
export function rngGaussian(rng: Rng): number {
  return (rng.next() + rng.next() + rng.next() - 1.5) / 1.5;
}

/** Deterministic 32-bit hash of a string, for stable non-random derived values. */
export function hashStr(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
