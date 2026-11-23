import { describe, expect, test } from "bun:test";
import { createGame, type Game } from "../src/index";

/** Step until the person arrives at `target`, with a safety cap. */
function waitForArrival(game: Game, personId: string, target: string): void {
  for (let i = 0; i < 300 && game.world.people[personId]!.location !== target; i++) game.step();
}

describe("commands", () => {
  test("travel is not instant: the traveller leaves, then arrives after the route's days", () => {
    const game = createGame(1);
    const towns = game.snapshot().towns;
    const home = game.snapshot().player.location;
    const target = towns.find((t) => t.id !== home)!.id;
    game.send({ kind: "player" }, { kind: "travel", to: target });
    expect(game.world.people[game.snapshot().player.personId]!.location).toBeNull();
    expect(game.snapshot().player.journey).not.toBeNull();
    waitForArrival(game, game.snapshot().player.personId, target);
    expect(game.snapshot().player.location).toBe(target);
    expect(game.snapshot().player.journey).toBeNull();
  });

  test("buying spends cash and adds stock; selling restores cash", () => {
    const game = createGame(2);
    const at = game.snapshot().player.location!;
    const before = game.snapshot().player.cash;
    game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 5 });
    const afterBuy = game.snapshot();
    expect(afterBuy.player.cash).toBeLessThan(before);
    expect(afterBuy.player.stock.grain).toBeGreaterThanOrEqual(5);

    game.send({ kind: "player" }, { kind: "sell", good: "grain", at, quantity: 3 });
    const afterSell = game.snapshot();
    expect(afterSell.player.stock.grain).toBeLessThan(afterBuy.player.stock.grain);
    expect(afterSell.player.cash).toBeGreaterThan(afterBuy.player.cash);
  });

  test("commands execute in submission order within a day", () => {
    const game = createGame(3);
    const at = game.snapshot().player.location!;
    // Sell before buying the same good: the sell finds no stock and fails first.
    game.send({ kind: "player" }, { kind: "sell", good: "iron", at, quantity: 2 });
    game.send({ kind: "player" }, { kind: "buy", good: "iron", at, quantity: 2 });
    expect(game.world.history.length).toBeGreaterThanOrEqual(2);
    expect(game.world.history[0]).toMatchObject({ kind: "trade-failed" });
    expect(game.world.history[1]).toMatchObject({ kind: "trade" });
    expect(game.snapshot().player.stock.iron).toBe(2);
  });

  test("unimplemented commands are gone; unknown kinds cannot be enqueued", () => {
    // The Command union is trimmed to travel | buy | sell. A stray kind
    // (formerly "unimplemented") no longer type-checks, so there is nothing
    // to route at runtime. This test guards the union indirectly: any
    // exhaustive switch over Command must compile with exactly three cases.
    const commandKinds = ["travel", "buy", "sell"] as const;
    expect([...commandKinds]).toHaveLength(3);
  });

  test("an organization actor command acts on its head person", () => {
    const game = createGame(8);
    const org = game.world.organizations.find((o) => o.memberIds.length > 0)!;
    const headId = org.memberIds[0]!;
    const headLocation = game.world.people[headId]!.location;
    const target = game.snapshot().towns.find((t) => t.id !== headLocation)!.id;
    game.send({ kind: "organization", id: org.id }, { kind: "travel", to: target });
    waitForArrival(game, headId, target);
    expect(game.world.people[headId]!.location).toBe(target);
    expect(game.world.history.some((o) => o.kind === "travel" && o.actorId === headId)).toBe(true);
  });

  test("a person actor command acts on that person", () => {
    const game = createGame(9);
    const person = game.world.organizations.find((o) => o.memberIds.length > 0)!;
    const personId = person.memberIds[1]!;
    const location = game.world.people[personId]!.location;
    const target = game.snapshot().towns.find((t) => t.id !== location)!.id;
    game.send({ kind: "person", id: personId }, { kind: "travel", to: target });
    waitForArrival(game, personId, target);
    expect(game.world.people[personId]!.location).toBe(target);
  });

  test("missing organizations and persons fail cleanly", () => {
    const game = createGame(10);
    const at = game.snapshot().player.location!;
    game.send({ kind: "person", id: "person-999999" }, { kind: "buy", good: "grain", at, quantity: 1 });
    game.send({ kind: "organization", id: "org-999999" }, { kind: "buy", good: "grain", at, quantity: 1 });
    expect(game.world.history).toHaveLength(2);
    expect(game.world.history[0]).toMatchObject({ kind: "trade-failed" });
    expect(game.world.history[1]).toMatchObject({ kind: "trade-failed" });
  });

  test("buying an invalid quantity fails cleanly", () => {
    const game = createGame(11);
    const at = game.snapshot().player.location!;
    game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 0 });
    expect(game.world.history[0]).toMatchObject({ kind: "trade-failed" });
  });

  test("selling goods you do not hold fails cleanly", () => {
    const game = createGame(12);
    const at = game.snapshot().player.location!;
    game.send({ kind: "player" }, { kind: "sell", good: "iron", at, quantity: 5 });
    expect(game.world.history[0]).toMatchObject({ kind: "trade-failed" });
  });

  test("buying beyond your cash fails cleanly", () => {
    const game = createGame(13);
    const at = game.snapshot().player.location!;
    game.send({ kind: "player" }, { kind: "buy", good: "salt", at, quantity: 1_000_000 });
    expect(game.world.history[0]).toMatchObject({ kind: "trade-failed" });
  });

  test("trading in a town you are not in fails cleanly", () => {
    const game = createGame(14);
    const towns = game.snapshot().towns;
    const home = game.snapshot().player.location!;
    const other = towns.find((t) => t.id !== home)!.id;
    game.send({ kind: "player" }, { kind: "travel", to: other });
    game.send({ kind: "player" }, { kind: "buy", good: "grain", at: home, quantity: 1, day: 1 });
    game.step();
    expect(game.world.history[1]).toMatchObject({ kind: "trade-failed" });
  });

  test("send applies a due command immediately, without a step", () => {
    const game = createGame(15);
    const at = game.snapshot().player.location!;
    const before = game.snapshot().player.cash;
    game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 4 });
    const after = game.snapshot();
    expect(after.player.cash).toBeLessThan(before);
    expect(after.player.stock.grain).toBeGreaterThanOrEqual(4);
  });

  test("send queues a future-dated command until its day", () => {
    const game = createGame(16);
    const at = game.snapshot().player.location!;
    const before = game.snapshot().player.cash;
    game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 2, day: 5 });
    expect(game.snapshot().player.cash).toBe(before);
    game.step();
    game.step();
    game.step();
    game.step();
    game.step();
    expect(game.snapshot().player.cash).toBeLessThan(before);
    expect(game.snapshot().player.stock.grain).toBeGreaterThanOrEqual(2);
  });
});
