import {
  BASE_PRICES,
  BASE_TRANSPORT_OFFSET,
  COUNTY_COUNT,
  COUNTY_GRID,
  COUNTY_SELF_SUFFICIENCY,
  DAILY_TARGET_DAYS,
  DAYS_PER_YEAR,
  GOODS,
  GOOD_SCHEMES,
  POPULATION_MAX,
  POPULATION_MIN,
  ROAD_SPEED,
  SCARCE_SUPPLY_FACTOR,
  STARTING_CASH,
  TOLL_PER_UNIT,
  TOWNS_PER_COUNTY,
  TRADERS_PER_COUNTY,
  TRADERS_PER_HOUSE,
  WORLD_SIZE,
} from "./constants";
import { round } from "./explain";
import { makeNameGen } from "./names";
import { createRng, rngInt, rngPick, rngRange, rngShuffle } from "./rng";
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
    shocks: [],
    rng,
    counters: { person: 0, town: 0, county: 0, org: 0, holding: 0, alert: 0, command: 0, road: 0, shock: 0 },
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
          population: rngInt(rng, POPULATION_MIN, POPULATION_MAX + 1),
          crime: rng.next() * 0.3,
          unrest: rng.next() * 0.25,
        };
        world.towns.push(town);
        world.markets[town.id] = {};
      }
    }
  }

  generateRoads(world, rng);
  generateOrganizations(world, counters, names, rng);
  // The merchant house town's population is boosted inside generateOrganizations,
  // so the economy is sized against the final populations.
  initializeEconomy(world, rng);
  generateTraders(world, counters, names, rng);
  generatePlayer(world, counters, names, rng);

  return world;
}

/**
 * The NPC merchants who keep the world trading without the player: a couple in
 * every county plus a couple tied to each merchant house. They are ordinary
 * people with the `isTrader` flag and a merchant's starting purse; the trader
 * system in npc.ts decides their actions each day from that point on.
 */
function generateTraders(
  world: World,
  counters: GenCounters,
  names: ReturnType<typeof makeNameGen>,
  rng: ReturnType<typeof createRng>,
): void {
  for (const county of world.counties) {
    const towns = world.towns.filter((t) => t.countyId === county.id);
    for (let i = 0; i < TRADERS_PER_COUNTY; i++) {
      createTrader(world, counters, names, rngPick(rng, towns).id, rng);
    }
  }
  const houses = world.organizations.filter((o) => o.kind === "merchant_house");
  for (const house of houses) {
    const homeTown = world.towns.find((t) => t.countyId === house.countyId) ?? rngPick(rng, world.towns);
    for (let i = 0; i < TRADERS_PER_HOUSE; i++) {
      createTrader(world, counters, names, homeTown.id, rng);
    }
  }
}

function createTrader(
  world: World,
  counters: GenCounters,
  names: ReturnType<typeof makeNameGen>,
  homeTownId: TownId,
  rng: ReturnType<typeof createRng>,
): void {
  const id = makePerson(world, counters, names, homeTownId, rngInt(rng, 18, 55));
  const person = world.people[id]!;
  person.isTrader = true;
  person.wealth = Math.round(rngRange(rng, 150, 400));
}

/**
 * Set the production numbers that drive the stock economy. Widespread goods
 * are grown by every town, scaled so each county produces `COUNTY_SELF_SUFFICIENCY`
 * times what its own people eat; scarce goods come from a small fixed number of
 * specialist towns, scaled so the country produces `SCARCE_SUPPLY_FACTOR` times
 * what everyone needs. Sizing production against actual populations is what
 * guarantees the "total production >= 1.1x total consumption" contract of the
 * economy, for every seed.
 */
function initializeEconomy(world: World, rng: ReturnType<typeof createRng>): void {
  for (const good of GOODS) {
    const scheme = GOOD_SCHEMES[good.id]!;
    if (scheme.kind === "widespread") {
      for (const county of world.counties) {
        const towns = world.towns.filter((t) => t.countyId === county.id);
        const rels = towns.map(() => rngRange(rng, 0.4, 1.6));
        const relSum = rels.reduce((sum, rel) => sum + rel, 0);
        const consumption = towns.reduce((sum, t) => sum + (t.population * good.perCapitaNeed) / DAYS_PER_YEAR, 0);
        const productionTotal = COUNTY_SELF_SUFFICIENCY * consumption;
        towns.forEach((town, index) => {
          initMarket(world, town.id, good.id, town.population, (productionTotal * rels[index]!) / relSum, good.perCapitaNeed, rng);
        });
      }
    } else {
      const producers = new Set(rngShuffle(rng, world.towns).slice(0, scheme.producers ?? 0).map((t) => t.id));
      const consumption = world.towns.reduce((sum, t) => sum + (t.population * good.perCapitaNeed) / DAYS_PER_YEAR, 0);
      const perProducer = (SCARCE_SUPPLY_FACTOR * consumption) / (scheme.producers ?? 1);
      for (const town of world.towns) {
        initMarket(world, town.id, good.id, town.population, producers.has(town.id) ? perProducer : 0, good.perCapitaNeed, rng);
      }
    }
  }
}

/** Build one market entry: base price, stock, production, consumption, target. */
function initMarket(
  world: World,
  townId: TownId,
  goodId: GoodId,
  population: number,
  production: number,
  perCapitaNeed: number,
  rng: ReturnType<typeof createRng>,
): void {
  const dailyConsumption = (population * perCapitaNeed) / DAYS_PER_YEAR;
  const target = round(dailyConsumption * DAILY_TARGET_DAYS, 3);
  // Base prices are effectively global: at most a ±5% transport offset. Price
  // differences come from stock, never from permanent per-town base gaps.
  const transport = 1 + rngRange(rng, -BASE_TRANSPORT_OFFSET, BASE_TRANSPORT_OFFSET);
  world.markets[townId]![goodId] = {
    base: round(BASE_PRICES[goodId]! * transport, 2),
    stock: target, // markets open fully stocked; surpluses and deficits emerge
    production: round(production, 3),
    dailyConsumption: round(dailyConsumption, 3),
    target,
  };
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
  let homeBoosted = false;
  for (const kind of kinds) {
    const town = rngPick(rng, world.towns);
    // The first merchant house anchors the player's home town, so that town is
    // a populous market town. A large home market also keeps cash failures
    // reachable: buying its whole stock of an expensive good costs more than
    // the player's starting wealth.
    if (kind === "merchant_house" && !homeBoosted) {
      const home = world.towns.find((t) => t.countyId === town.countyId);
      if (home) home.population = rngInt(rng, 900, POPULATION_MAX + 1);
      homeBoosted = true;
    }
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
