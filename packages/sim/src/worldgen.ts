import {
  BASE_PRICES,
  COUNTY_COUNT,
  COUNTY_GRID,
  GOODS,
  STARTING_CASH,
  TOWNS_PER_COUNTY,
  WORLD_SIZE,
} from "./constants";
import { makeNameGen } from "./names";
import { createRng, rngInt, rngPick, rngRange } from "./rng";
import type { County, Organization, Person, Town, World } from "./state";
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
    organizations: [],
    people: {},
    markets: {},
    player: { personId: "person-0", background: "Merchant's heir", familyIds: [] },
    queue: [],
    history: [],
    alerts: [],
    rng,
    counters: { person: 0, town: 0, county: 0, org: 0, holding: 0, alert: 0 },
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

  generateOrganizations(world, counters, names, rng);
  generatePlayer(world, counters, names, rng);

  return world;
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
    age,
    location: atTown,
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
