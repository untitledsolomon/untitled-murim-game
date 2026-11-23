import { describe, expect, test } from "bun:test";
import { COUNTY_COUNT, GOODS, WORLD_SIZE } from "../src/constants";
import { createWorld } from "../src/index";

describe("world generation", () => {
  test("produces the full country layout", () => {
    const world = createWorld(1_234_567);
    expect(world.counties).toHaveLength(COUNTY_COUNT);
    expect(world.towns.length).toBeGreaterThanOrEqual(10);
    expect(world.organizations.length).toBeGreaterThanOrEqual(5);
  });

  test("places every town inside the world bounds", () => {
    const world = createWorld(42);
    for (const town of world.towns) {
      const [x, y] = town.position;
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(WORLD_SIZE);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(WORLD_SIZE);
    }
  });

  test("gives every town unique ids and all essential goods", () => {
    const world = createWorld(99);
    const ids = new Set(world.towns.map((t) => t.id));
    expect(ids.size).toBe(world.towns.length);
    for (const town of world.towns) {
      for (const good of GOODS) {
        const entry = world.markets[town.id]?.[good.id];
        expect(entry, `${town.id} ${good.id}`).toBeDefined();
        expect(entry!.base).toBeGreaterThan(0);
      }
    }
  });

  test("assigns one magistrate per county", () => {
    const world = createWorld(7);
    for (const county of world.counties) {
      const towns = world.towns.filter((t) => t.countyId === county.id);
      const magistrates = new Set(towns.map((t) => t.magistrateId));
      expect(magistrates.size).toBe(1);
      for (const magistrateId of magistrates) {
        expect(world.people[magistrateId], "magistrate is a generated person").toBeDefined();
      }
    }
  });

  test("the player exists with a family and starting wealth", () => {
    const world = createWorld(5);
    const player = world.people[world.player.personId];
    expect(player).toBeDefined();
    expect(player!.wealth).toBeGreaterThan(0);
    expect(world.player.familyIds.length).toBeGreaterThan(0);
  });
});
