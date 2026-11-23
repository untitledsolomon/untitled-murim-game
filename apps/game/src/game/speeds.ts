/** Time speeds (multipliers on real time) the game cycles through. */
export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

export type Speed = (typeof SPEEDS)[number];
