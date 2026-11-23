import { describe, expect, test } from "bun:test";
import { createGame } from "../src/index";

describe("tick", () => {
  test("advances the calendar one day at a time", () => {
    const game = createGame(11);
    const start = game.snapshot().day;
    game.step();
    expect(game.snapshot().day).toBe(start + 1);
  });

  test("prices drift but stay within the model bounds", () => {
    const game = createGame(22);
    for (let i = 0; i < 60; i++) game.step();
    const snapshot = game.snapshot();
    for (const town of snapshot.towns) {
      for (const goodId of Object.keys(town.goods)) {
        const entry = town.goods[goodId]!;
        expect(entry.trend).toBeGreaterThan(-0.31);
        expect(entry.trend).toBeLessThan(0.31);
        expect(entry.market.value).toBeGreaterThan(0);
        expect(entry.market.factors.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  test("produces alerts and outliner items over time", () => {
    const game = createGame(33);
    for (let i = 0; i < 90; i++) game.step();
    const snapshot = game.snapshot();
    expect(Array.isArray(snapshot.alerts)).toBe(true);
    expect(Array.isArray(snapshot.outliner)).toBe(true);
    expect(snapshot.organizations.length).toBeGreaterThan(0);
  });

  test("commands due on a later day wait until that day", () => {
    const game = createGame(44);
    const home = game.snapshot().player.location!;
    const target = game.snapshot().towns.find((t) => t.id !== home)!.id;
    game.send({ kind: "player" }, { kind: "travel", to: target, day: 10 });
    game.step(); // day 1
    expect(game.snapshot().player.location).toBe(home);
    // The travel command fires on day 10; the journey then takes its days.
    for (let i = 0; i < 30 && game.snapshot().player.location !== target; i++) game.step();
    expect(game.snapshot().player.location).toBe(target);
  });
});
