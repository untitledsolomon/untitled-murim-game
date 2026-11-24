import type { Road, World } from "./state";
import type { TownId } from "./types";

/** A route between two towns, computed over the road graph. */
export interface TravelPlan {
  /** The route as a town path, departure town first and destination last. */
  path: TownId[];
  /** Total travel days for the whole route. */
  days: number;
  /** Total road toll for the whole route. */
  toll: number;
  /** Travel days of each leg, matching `path[i] -> path[i + 1]`. */
  legs: number[];
}

function roadsFrom(world: World, townId: TownId): Road[] {
  return world.roads.filter((r) => r.a === townId || r.b === townId);
}

function roadBetween(world: World, a: TownId, b: TownId): Road | undefined {
  return world.roads.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
}

/**
 * The shortest route between two towns by travel days, over roads that are
 * open. Runs Dijkstra with the town as node and travel days as edge weight.
 * Returns null when no route exists (for example, a flood closing every road
 * out of a town). Travel is planned over true open roads — a small, known
 * omniscience the player does not have, recorded in docs/decisions.md.
 */
export function shortestPath(
  world: World,
  from: TownId,
  to: TownId,
  ignoreFlooded = true,
): TravelPlan | null {
  if (from === to) return { path: [from], days: 0, toll: 0, legs: [] };

  const dist = new Map<TownId, number>([[from, 0]]);
  const prev = new Map<TownId, TownId>();
  const visited = new Set<TownId>();

  let current: TownId | undefined = from;
  while (current !== undefined) {
    visited.add(current);
    if (current === to) break;

    const currentDist = dist.get(current)!;
    for (const road of roadsFrom(world, current)) {
      if (ignoreFlooded && road.status === "flooded") continue;
      const next = road.a === current ? road.b : road.a;
      if (visited.has(next)) continue;
      const candidate = currentDist + road.travelDays;
      if (candidate < (dist.get(next) ?? Infinity)) {
        dist.set(next, candidate);
        prev.set(next, current);
      }
    }

    let best: TownId | undefined;
    let bestDist = Infinity;
    for (const [node, d] of dist) {
      if (!visited.has(node) && d < bestDist) {
        best = node;
        bestDist = d;
      }
    }
    current = best;
  }

  if (current === undefined) return null;

  const path: TownId[] = [to];
  let cursor: TownId | undefined = to;
  while (cursor !== from) {
    cursor = prev.get(cursor);
    if (cursor === undefined) return null;
    path.unshift(cursor);
  }

  const legs: number[] = [];
  let toll = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const road = roadBetween(world, path[i]!, path[i + 1]!);
    legs.push(road?.travelDays ?? 0);
    toll += road?.toll ?? 0;
  }
  const days = legs.reduce((sum, d) => sum + d, 0);
  return { path, days, toll, legs };
}

/** Is every town reachable from every other over the road network? */
export function isConnected(world: World): boolean {
  if (world.towns.length === 0) return true;
  const seen = new Set<TownId>([world.towns[0]!.id]);
  const stack = [world.towns[0]!.id];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const road of world.roads) {
      const next = road.a === current ? road.b : road.b === current ? road.a : null;
      if (next !== null && !seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen.size === world.towns.length;
}
