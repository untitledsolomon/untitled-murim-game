import { GOODS, goodLabel } from "./constants";
import { factor, round, scalePrice, sumFactors, sumPrices } from "./explain";
import { marketPrice } from "./pricing";
import { hashStr } from "./rng";
import { ageOf, type World } from "./state";
import {
  type CountySnapshot,
  type OrganizationSnapshot,
  type OutlinerItem,
  type PersonSnapshot,
  type Price,
  type Snapshot,
  type SnapshotOptions,
  type TownSnapshot,
} from "./types";

/**
 * A pure read of the world into the shapes the UI binds to.
 * Called when a day rolls over, never mid-frame.
 */
export function buildSnapshot(world: World, options: SnapshotOptions = {}): Snapshot {
  const people: Record<string, PersonSnapshot> = {};
  for (const personId of Object.keys(world.people)) {
    const person = world.people[personId]!;
    const snapshot: PersonSnapshot = {
      id: person.id,
      name: person.name,
      age: ageOf(world, person),
      location: person.location,
    };
    if (person.familyRole !== undefined) snapshot.familyRole = person.familyRole;
    people[personId] = snapshot;
  }

  const player = world.people[world.player.personId]!;
  const ledger: Snapshot["player"]["ledger"] = world.history
    .filter((outcome) => outcome.actorId === player.id)
    .slice(-30)
    .reverse()
    .map((outcome) => ({ day: outcome.day, text: outcome.text, kind: outcome.kind }));

  const counties: CountySnapshot[] = world.counties.map((county) => ({
    id: county.id,
    name: county.name,
    isCapital: county.isCapital,
  }));

  const towns: TownSnapshot[] = world.towns.map((town) => {
    const goods: TownSnapshot["goods"] = {};
    for (const good of GOODS) {
      const entry = world.markets[town.id]?.[good.id];
      goods[good.id] = {
        basePrice: entry?.base ?? 0,
        market: marketPrice(world, town.id, good.id),
        trend: entry?.trend ?? 0,
      };
    }
    return {
      id: town.id,
      countyId: town.countyId,
      name: town.name,
      position: town.position,
      magistrateId: town.magistrateId,
      goods,
      crime: town.crime,
      unrest: town.unrest,
      influence: townInfluence(world, town.id),
      known: true,
    };
  });

  const organizations: OrganizationSnapshot[] = world.organizations.map((org) => ({
    id: org.id,
    name: org.name,
    kind: org.kind,
    members: org.memberIds
      .filter((memberId) => people[memberId] !== undefined)
      .map((memberId, index) => ({
        personId: memberId,
        role: index === 0 ? "Head" : "Member",
        loyalty: 40 + (hashStr(`${org.id}:${memberId}`) % 61),
      })),
    holdings: org.holdings.map((holding) => ({
      good: holding.good,
      quantity: holding.quantity,
      value: scalePrice(marketPrice(world, orgCountyTown(world, org), holding.good), holding.quantity),
    })),
    capabilities: org.capabilities,
    reputation: sumFactors([
      factor("Reputation", org.reputation),
      factor("Members", org.memberIds.length * 5),
    ]),
    foundedDay: org.foundedDay,
  }));

  const family: PersonSnapshot[] = world.player.familyIds
    .filter((familyId) => people[familyId] !== undefined)
    .map((familyId) => people[familyId]!);

  const measures = buildMeasures(world, player);

  const alerts = world.alerts.map((alert) => ({ ...alert }));

  const outliner = buildOutliner(towns, organizations);

  return {
    seed: world.seed,
    day: world.day,
    player: {
      personId: player.id,
      name: player.name,
      age: ageOf(world, player),
      background: world.player.background,
      location: player.location,
      cash: round(player.wealth),
      stock: { ...player.stock },
      family,
      ledger,
    },
    counties,
    towns,
    organizations,
    goods: GOODS,
    measures,
    alerts,
    outliner,
  };
}

function buildMeasures(world: World, player: World["people"][string]): Snapshot["measures"] {
  const orgs = world.organizations.filter((org) => org.memberIds.includes(player.id));

  // Wealth = cash plus the market value of everything carried.
  const wealthFactors = [factor("Cash", player.wealth)];
  for (const goodId of Object.keys(player.stock)) {
    const quantity = player.stock[goodId] ?? 0;
    if (quantity <= 0 || player.location === null) continue;
    const base = marketPrice(world, player.location, goodId).value;
    wealthFactors.push(factor(goodLabel(goodId), base * quantity));
  }
  const wealth = sumFactors(wealthFactors);

  // Influence grows with the size and reputation of the organizations the player belongs to.
  const influence = orgs.length === 0 ? sumFactors([factor("No standing connections", 0)]) : sumPrices(
    orgs.map((org) =>
      sumFactors([
        factor(`${org.name} reputation`, org.reputation / 10),
        factor(`${org.name} members`, org.memberIds.length),
      ]),
    ),
  );

  // Power comes from public office; none held yet.
  const power = sumFactors([factor("No public office", 0)]);

  return { wealth, influence, power };
}

function buildOutliner(
  towns: TownSnapshot[],
  organizations: OrganizationSnapshot[],
): OutlinerItem[] {
  const items: OutlinerItem[] = [];
  for (const town of towns) {
    if (town.unrest > 0.4) {
      items.push({ id: `todo-${town.id}`, label: `Unrest high in ${town.name}`, kind: "unrest", priority: town.unrest });
    }
    for (const goodId of Object.keys(town.goods)) {
      const entry = town.goods[goodId]!;
      if (Math.abs(entry.trend) > 0.15) {
        items.push({
          id: `todo-${town.id}-${goodId}`,
          label: `${goodLabel(goodId)} ${entry.trend > 0 ? "scarce and dear" : "plentiful and cheap"} in ${town.name}`,
          kind: "prices",
          priority: Math.abs(entry.trend),
        });
        break;
      }
    }
  }
  for (const org of organizations) {
    if (org.reputation.value < 40) {
      items.push({ id: `todo-${org.id}`, label: `${org.name} reputation slipping`, kind: "reputation", priority: (50 - org.reputation.value) / 50 });
    }
  }
  return items.sort((a, b) => b.priority - a.priority).slice(0, 8);
}

/** Influence of a single town, from the organizations active in its county. */
function townInfluence(world: World, townId: string): Price {
  const town = world.towns.find((t) => t.id === townId);
  if (!town) return sumFactors([factor("Unknown", 0)]);
  const factors = world.organizations
    .filter((org) => org.countyId === town.countyId)
    .map((org) => factor(org.name, Math.round(org.reputation / 10) + org.memberIds.length));
  return sumFactors(factors.length > 0 ? factors : [factor("No established groups", 0)]);
}

/** A town in the org's county, used as the reference market for its holdings. */
function orgCountyTown(world: World, org: World["organizations"][number]): string {
  return world.towns.find((t) => t.countyId === org.countyId)?.id ?? world.towns[0]!.id;
}
