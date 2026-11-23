import { createRng } from "./rng";
import type { World } from "./state";

// Phase 2 set format 3; Phase 3 adds the road network, journeys, county
// bounds, carry capacity, and the road counter.
const FORMAT_VERSION = 4;

/**
 * Serialize the world to a string that restores it exactly. The RNG state is
 * part of the world, so an exact replay stays byte-identical.
 */
export function serializeState(world: World): string {
  const { rng, ...data } = world;
  const envelope = { version: FORMAT_VERSION, rngState: rng.state, ...data };
  return JSON.stringify(envelope);
}

/** Restore a world from a serialization produced by serializeState. */
export function deserializeState(text: string): World {
  const parsed = JSON.parse(text) as Partial<World> & { version: number; rngState: number };
  if (parsed.version !== FORMAT_VERSION) {
    throw new Error(`Unsupported save format version ${parsed.version ?? "unknown"}`);
  }
  const { version, rngState, ...data } = parsed;
  const world = data as World;
  world.rng = createRng(rngState);
  return world;
}
