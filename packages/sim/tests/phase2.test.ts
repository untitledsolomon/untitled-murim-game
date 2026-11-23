import { describe, expect, test } from "bun:test";
import { createGame } from "../src/index";

describe("phase 2: actor-generic send and time", () => {
  test("send assigns ids from a shared counter and logs submissions", () => {
    const game = createGame(501);
    const at = game.snapshot().player.location!;
    const a = game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 2 });
    const b = game.send({ kind: "player" }, { kind: "buy", good: "salt", at, quantity: 1 });
    expect(a.id).toBe("cmd-0");
    expect(b.id).toBe("cmd-1");
    expect(game.world.commandLog.map((e) => e.order)).toEqual([0, 1]);
    expect(game.world.commandLog[0]!.day).toBe(0);
    expect(game.world.commandLog[0]!.command.id).toBe("cmd-0");
  });

  test("organization and person actors share the same command counter", () => {
    const game = createGame(506);
    const at = game.snapshot().player.location!;
    const a = game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 1 });
    const org = game.world.organizations.find((o) => o.memberIds.length > 0)!;
    const headLocation = game.world.people[org.memberIds[0]!]!.location;
    const to = game.snapshot().towns.find((t) => t.id !== headLocation)!.id;
    const b = game.send({ kind: "organization", id: org.id }, { kind: "travel", to });
    expect(a.id).toBe("cmd-0");
    expect(b.id).toBe("cmd-1");
    expect(game.world.commandLog).toHaveLength(2);
  });

  test("send defaults the execution day to today", () => {
    const game = createGame(502);
    const at = game.snapshot().player.location!;
    game.step();
    game.step();
    const command = game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 1 });
    expect(command.day).toBe(2);
    expect(game.world.commandLog[0]!.day).toBe(2);
  });

  test("the player ledger shows only the player's outcomes, newest first", () => {
    const game = createGame(503);
    const at = game.snapshot().player.location!;
    const org = game.world.organizations.find((o) => o.memberIds.length > 1)!;
    const foreignId = org.memberIds[1]!;
    const foreignName = game.world.people[foreignId]!.name;

    // A foreign person trades in the same town; their outcome is world history
    // but must never leak into the player's ledger.
    if (game.world.people[foreignId]!.location !== at) {
      game.send({ kind: "person", id: foreignId }, { kind: "travel", to: at });
    }
    game.send({ kind: "person", id: foreignId }, { kind: "buy", good: "grain", at, quantity: 1 });
    game.send({ kind: "player" }, { kind: "buy", good: "salt", at, quantity: 1 });
    game.send({ kind: "player" }, { kind: "sell", good: "grain", at, quantity: 1 });

    // The foreigner's buy is recorded in the world, tagged with their id.
    expect(game.world.history.some((o) => o.actorId === foreignId && o.kind === "trade")).toBe(true);

    const ledger = game.snapshot().player.ledger;
    // Only the player's own two trades, newest first: the sell then the buy.
    expect(ledger.map((e) => e.kind)).toEqual(["trade", "trade"]);
    expect(ledger[0]!.text).toContain("sells 1 grain");
    expect(ledger[1]!.text).toContain("buys 1 salt");
    expect(ledger.every((e) => e.text.includes(foreignName))).toBe(false);
  });

  test("the player ledger is capped at the 30 newest entries", () => {
    const game = createGame(504);
    const at = game.snapshot().player.location!;
    for (let i = 0; i < 40; i++) {
      game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 1 });
    }
    // All 40 are in the world history; the ledger keeps only the newest 30.
    expect(game.world.history.filter((o) => o.actorId === game.snapshot().player.personId)).toHaveLength(40);
    const ledger = game.snapshot().player.ledger;
    expect(ledger).toHaveLength(30);
    expect(ledger[0]!.day).toBe(0);
    expect(ledger.every((e) => e.kind === "trade")).toBe(true);
  });

  test("person snapshots carry the family role and derived age", () => {
    const game = createGame(505);
    const family = game.snapshot().player.family;
    expect(family.map((f) => f.familyRole).sort()).toEqual(["child", "spouse"]);
    for (const member of family) {
      const person = game.world.people[member.id]!;
      // Age is derived from birthDay, never stored: it equals the world calc.
      expect(member.age).toBe(Math.max(0, Math.floor((game.world.day - person.birthDay) / 360)));
      expect(member.familyRole).toBe(person.familyRole);
    }
  });

  test("the command log survives save and load", () => {
    const game = createGame(507);
    const at = game.snapshot().player.location!;
    game.send({ kind: "player" }, { kind: "buy", good: "grain", at, quantity: 2 });
    game.send({ kind: "player" }, { kind: "travel", to: game.snapshot().towns.find((t) => t.id !== at)!.id, day: 3 });
    for (let i = 0; i < 5; i++) game.step();

    const fresh = createGame(999);
    fresh.load(game.serialize());
    expect(fresh.world.commandLog.length).toBe(2);
    expect(fresh.world.commandLog[0]!.command.id).toBe("cmd-0");
    expect(fresh.world.commandLog[1]!.command.day).toBe(3);
  });
});
