import {
  BASE_PRICES,
  COUNTY_COUNT,
  COUNTY_GRID,
  DAYS_PER_YEAR,
  GOODS,
  ROAD_SPEED,
  STARTING_CASH,
  TOLL_PER_UNIT,
  TOWNS_PER_COUNTY,
  WORLD_SIZE,
} from "./constants";
import { makeNameGen } from "./names";
import { createRng, rngInt, rngPick, rngRange } from "./rng";
import type { County, Organization, Person, Road, Town, World } from "./state";
import type { GoodId, TownId } from "./types";

interface GenCounters {
  county: number;
  town: number;
  person: number;
  org: number;
}

function nextId(counters: GenCounters, prefix: "county" | "town" | "person" | "org"): string {
  const value = counters[prefix]++;
  return `${prefix}-${value}`;
}

/** Build a fully seeded world. The same seed always produces the same world. */
export function generateWorld(seed: number): World {
  const rng = createRng(seed);
  const names = makeNameGen(rng);
  const counters: GenCounters = { county: 0, town: 0, person: 0, org: 0 };

  const world: World = {
    seed,
    day: 0,
    counties: [],
    towns: [],
    roads: [],
    organizations: [],
    people: {},
    markets: {},
    player: { personId: "person-0", background: "Merchant's heir", familyIds: [] },
    queue: [],
    commandLog: [],
    history: [],
    alerts: [],
    rng,
    counters: { person: 0, town: 0, county: 0, org: 0, holding: 0, alert: 0, command: 0, road: 0 },
  };

  // Counties laid out on a square grid.
  const cellSize = WORLD_SIZE / COUNTY_GRID;
  for (let gy = 0; gy < COUNTY_GRID; gy++) {
    for (let gx = 0; gx < COUNTY_GRID; gx++) {
      const id = nextId(counters, "county");
      const county: County = {
        id,
        name: names.county(),
        isCapital: world.counties.length === 0,
        bounds: { minX: gx * cellSize, minY: gy * cellSize, maxX: (gx + 1) * cellSize, maxY: (gy + 1) * cellSize },
      };
      world.counties.push(county);

      // Each county has one magistrate, who is also the town official for every town in the county.
      const magistrateId = makePerson(world, counters, names);

      for (let t = 0; t < TOWNS_PER_COUNTY; t++) {
        const margin = cellSize * 0.22;
        const x = gx * cellSize + margin + rng.next() * (cellSize - 2 * margin);
        const y = gy * cellSize + margin + rng.next() * (cellSize - 2 * margin);
        const townId = nextId(counters, "town");
        const town: Town = {
          id: townId,
          countyId: county.id,
          name: names.town(),
          position: [Math.round(x * 10) / 10, Math.round(y * 10) / 10],
          magistrateId,
          crime: rng.next() * 0.3,
          unrest: rng.next() * 0.25,
        };
        world.towns.push(town);
        world.markets[town.id] = {};

        for (const good of GOODS) {
          // Specialty towns have a deep surplus of one good, which keeps prices low.
          const isSpecialty = rng.next() < 0.3;
          const multiplier = isSpecialty ? rngRange(rng, 0.4, 0.62) : rngRange(rng, 0.68, 1.35);
          world.markets[town.id]![good.id] = {
            base: Math.round(BASE_PRICES[good.id]! * multiplier * 100) / 100,
            trend: Math.round(rngRange(rng, -0.06, 0.06) * 1000) / 1000,
          };
        }
      }
    }
  }

  generateRoads(world, rng);
  generateOrganizations(world, counters, names, rng);
  generatePlayer(world, counters, names, rng);

  return world;
}

function distance(a: Town, b: Town): number {
  const dx = a.position[0] - b.position[0];
  const dy = a.position[1] - b.position[1];
  return Math.hypot(dx, dy);
}

function roadBetween(world: World, a: TownId, b: TownId): Road | undefined {
  return world.roads.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
}

function addRoad(world: World, a: TownId, b: TownId): void {
  if (a === b || roadBetween(world, a, b)) return;
  const at = world.towns.find((t) => t.id === a);
  const bt = world.towns.find((t) => t.id === b);
  if (!at || !bt) return;
  const length = distance(at, bt);
  world.roads.push({
    id: `road-${world.counters.road++}`,
    a,
    b,
    length: Math.round(length * 100) / 100,
    travelDays: Math.max(1, Math.ceil(length / ROAD_SPEED)),
    toll: Math.round(length * TOLL_PER_UNIT * 100) / 100,
    status: "open",
  });
}

/** A spanning tree over the towns, built with Prim's algorithm. */
function minimumSpanningTree(world: World, towns: Town[]): Array<[TownId, TownId]> {
  const edges: Array<[TownId, TownId]> = [];
  if (towns.length < 2) return edges;
  const inTree = new Set<TownId>([towns[0]!.id]);
  while (inTree.size < towns.length) {
    let best: { a: TownId; b: TownId; d: number } | null = null;
    for (const t of towns) {
      if (!inTree.has(t.id)) continue;
      for (const u of towns) {
        if (inTree.has(u.id)) continue;
        const d = distance(t, u);
        if (best === null || d < best.d) best = { a: t.id, b: u.id, d };
      }
    }
    if (best === null) break;
    edges.push([best.a, best.b]);
    inTree.add(best.b);
  }
  return edges;
}

/** Two towns are in the same component when a chain of roads links them. */
function components(world: World): Map<TownId, number> {
  const comp = new Map<TownId, number>();
  let index = 0;
  for (const town of world.towns) {
    if (comp.has(town.id)) continue;
    const stack = [town.id];
    comp.set(town.id, index);
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const road of world.roads) {
        const next = road.a === current ? road.b : road.b === current ? road.a : null;
        if (next !== null && !comp.has(next)) {
          comp.set(next, index);
          stack.push(next);
        }
      }
    }
    index++;
  }
  return comp;
}

/**
 * Build the road network. Roads are seeded but the network is structural: a
 * spanning tree per county plus a couple of extra loops (seeded), then the
 * closest towns' pair across components until the whole country is one
 * network. Closeness needs no rng, so the country is always connected.
 */
function generateRoads(world: World, rng: ReturnType<typeof createRng>): void {
  for (const county of world.counties) {
    const towns = world.towns.filter((t) => t.countyId === county.id);
    for (const [a, b] of minimumSpanningTree(world, towns)) addRoad(world, a, b);
    const extras = rngInt(rng, 1, 3); // one or two extra loops per county
    for (let i = 0; i < extras; i++) addRoad(world, rngPick(rng, towns).id, rngPick(rng, towns).id);
  }

  while (new Set(components(world).values()).size > 1) {
    let best: { a: TownId; b: TownId; d: number } | null = null;
    const comp = components(world);
    for (const a of world.towns) {
      const ca = comp.get(a.id)!;
      for (const b of world.towns) {
        if (a.id === b.id || comp.get(b.id) === ca) continue;
        const d = distance(a, b);
        if (best === null || d < best.d) best = { a: a.id, b: b.id, d };
      }
    }
    if (best === null) break;
    addRoad(world, best.a, best.b);
  }
}

function makePerson(
  world: World,
  counters: GenCounters,
  names: ReturnType<typeof makeNameGen>,
  atTown: TownId | null = null,
  age = 30,
): string {
  const id = nextId(counters, "person");
  const person: Person = {
    id,
    name: names.person(),
    // Born `age` years before day 0, so a 23-year-old starts at day 0 aged 23.
    birthDay: -age * DAYS_PER_YEAR,
    location: atTown,
    journey: null,
    wealth: rngRange(world.rng, 20, 90),
    stock: {},
  };
  world.people[id] = person;
  return id;
}

function generateOrganizations(
  world: World,
  counters: GenCounters,
  names: ReturnType<typeof makeNameGen>,
  rng: ReturnType<typeof createRng>,
): void {
  const kinds: Array<Organization["kind"]> = [
    "sect",
    "sect",
    "merchant_house",
    "merchant_house",
    "bank",
    "escort",
  ];
  for (const kind of kinds) {
    const town = rngPick(rng, world.towns);
    const memberCount = rngInt(rng, 4, 8);
    const memberIds: string[] = [];
    for (let i = 0; i < memberCount; i++) {
      memberIds.push(makePerson(world, counters, names, town.id, rngInt(rng, 17, 65)));
    }
    const org: Organization = {
      id: nextId(counters, "org"),
      name: organizationName(names, kind),
      kind,
      memberIds,
      holdings: [
        {
          id: `holding-${world.counters.holding++}`,
          good: rngPick(rng, GOODS).id,
          quantity: rngInt(rng, 5, 60),
        },
      ],
      capabilities: [kind],
      reputation: Math.round(rngRange(rng, 20, 80)),
      foundedDay: -rngInt(rng, 300, 2000),
      countyId: town.countyId,
    };
    world.organizations.push(org);
  }

  // The capital government is its own organization.
  const capital = world.counties.find((c) => c.isCapital) as County;
  const governmentTown = world.towns.find((t) => t.countyId === capital.id) as Town;
  const staffIds = [makePerson(world, counters, names, governmentTown.id, 45)];
  world.organizations.push({
    id: nextId(counters, "org"),
    name: `${capital.name} Yamen`,
    kind: "government",
    memberIds: staffIds,
    holdings: [{ id: `holding-${world.counters.holding++}`, good: "grain", quantity: 40 }],
    capabilities: ["government"],
    reputation: 55,
    foundedDay: -rngInt(rng, 2000, 3000),
    countyId: capital.id,
  });
}

function organizationName(
  names: ReturnType<typeof makeNameGen>,
  kind: Organization["kind"],
): string {
  switch (kind) {
    case "sect":
      return names.sect();
    case "merchant_house":
      return names.merchantHouse();
    case "bank":
      return names.bank();
    case "escort":
      return names.escort();
    case "government":
      return "Yamen";
  }
}

function generatePlayer(
  world: World,
  counters: GenCounters,
  names: ReturnType<typeof makeNameGen>,
  rng: ReturnType<typeof createRng>,
): void {
  // The player is the heir of the first merchant house.
  const house = world.organizations.find((o) => o.kind === "merchant_house") as Organization;
  const homeTownId = world.towns.find((t) => t.countyId === house.countyId)?.id ?? world.towns[0]!.id;

  const playerId = makePerson(world, counters, names, homeTownId, 23);
  const player = world.people[playerId]!;
  player.wealth = STARTING_CASH;
  player.stock = { grain: 10 };

  world.player.personId = playerId;
  world.player.background = "Merchant's heir";

  // A small family: spouse and one child.
  const spouseId = makePerson(world, counters, names, homeTownId, 22);
  world.people[spouseId]!.familyRole = "spouse";
  const childId = makePerson(world, counters, names, homeTownId, 5);
  world.people[childId]!.familyRole = "child";
  world.player.familyIds = [spouseId, childId];

  // The heir joins the house.
  house.memberIds.push(playerId);
}
