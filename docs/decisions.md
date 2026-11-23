# Design decisions

Every judgment call the design doc leaves open is recorded here, with the
reason. The rule of the project: decide, implement, record — do not stop to
ask unless truly blocked. Entries are newest first.

## Phase 1 — fix broken sim and hud

- **Validation-first commands.** `buy`/`sell` require the acting person to be
  physically in the trade town; `buy` requires enough cash; `sell` requires
  held stock. Every violation records a typed `trade-failed`/`travel-failed`
  outcome and changes nothing. An unknown actor reference (a person id or
  organization id that does not exist) records a typed failure too — a day
  step must never crash on a bad command.
- **Age is derived, not stored.** `Person.age` replaced with `birthDay`
  (negative for people born before day 0); age is
  `floor((day - birthDay) / DAYS_PER_YEAR)`. There is no date arithmetic
  drift and no store to keep in sync.
- **No save migration.** `FORMAT_VERSION` now 2 (was 1). Old saves are
  rejected with a clear message. Saves are cheap and the game is not
  released; migrating is not worth the code.
- **Sim purity is enforced by a test.** A test scans `packages/sim/src` and
  fails the suite if `Math.random`, `Date.now`, `performance.now`, or
  `new Date(` appears outside a comment. All randomness must go through the
  seeded rng.
- **The game starts paused.** The player chooses when the world moves.
  The engine pauses in its initializer; the HUD store default matches.
- **The outliner speaks plain trader language.** Outliner items use human
  text ("Salt scarce and dear in Jiangbei", "Unrest high in Chengxian") with
  kinds `unrest | prices | reputation`. The HUD renders those kinds directly.
- **Pan cannot lose the map.** The camera center is clamped to just past the
  world edge; the map cannot be dragged off into empty space.

## Reserved for later phases

- Phase 3: no random road robbery in v0.1 (road travel is costly only in
  days and tolls).
- Phase 4a: resource placement schemes per good; effective global base prices
  with at most a ±5% transport offset; the pricing function shape and its
  honest per-unit factor decomposition.
- Phase 4b: NPC knowledge stand-in (they trade on true spot prices until fog
  exists); tuned economic constants and why.
- Phase 5: `shortestPath` plans over true open roads — a small, known
  omniscience the player does not have.
- Phase 1b: the broken-menu root cause; UI test dependencies are dev-only.
