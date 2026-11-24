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

## Phase 4a — stock economy and pricing

- **Prices come from stock, not from a random walk.** The old `trend` field and
  its drift/mean-reversion/noise are gone. Every day each town market does
  `stock += production - dailyConsumption` (floored at 0), and the spot price is
  `base × f(stock)`, `f(stock) = clamp(1 + STOCK_RESPONSE × (target − stock) /
  max(target,1), 0.4, 3.0)` with `target = DAILY_TARGET_DAYS × dailyConsumption`.
  `STOCK_RESPONSE = 2`, so a fully de-stocked market prices at 3× and a well-fed
  surplus producer sinks to 0.4×.
- **Base prices are effectively global.** Each town's base is the global
  `BASE_PRICES` value times a seeded ±5% transport offset
  (`BASE_TRANSPORT_OFFSET`). There are no permanent per-town base gaps to
  arbitrage; every price difference the player acts on is a stock difference.
- **Production is sized from populations, so stability is by construction.**
  Widespread goods (grain, cloth) are grown by every town, with each county
  producing 1.15× its own consumption (`COUNTY_SELF_SUFFICIENCY`), distributed
  by seeded shares. Scarce goods (salt, tea, iron, medicine, timber) come from a
  small curated set of specialist towns whose total output is 1.3× the whole
  country's need (`SCARCE_SUPPLY_FACTOR`). Because rates derive from actual
  populations, "total production ≥ 1.1× total consumption per good" holds for
  every seed without tuning, and every town can reach a producer of every
  essential good over the road graph.
- **Markets open fully stocked, then diverge.** Every town starts at `stock =
  target`; surpluses and deficits then emerge from production. A small import
  floor (`IMPORT_FLOOR_DAYS = 3` of consumption, essentials only) is the
  "market inertia" that keeps a cut-off town from starving to absolute zero —
  blockaded towns settle near 2.8×, never at the hard 3× ceiling.
- **A trade is the sum of per-unit prices, each unit moving the market.** `buy`
  drains stock, `sell` restocks it. A quote factors exactly into `Base price`,
  `Supply vs demand (spot)`, and `Size of your order`; the sell adds a `Market
  spread` (5%) subtracted per unit. The factor-sum-to-value invariant is a
  property test. A same-town buy-then-sell round trip loses exactly the spread.
- **Buy caps at market stock, but still fails cleanly.** A buy takes only what
  the market holds (a big request is partly filled), while carry capacity and
  cash are still validated *first*, and no state changes on a failure. A cash
  failure is testable because the home market is held above the player's reach.
- **The heir's home town is a populous market town.** The first merchant house
  anchors the player's home at population ≥ 900, so the home market is big
  enough that buying its whole stock of an expensive good exceeds the player's
  starting cash — which is what keeps "buying beyond your cash" a reachable,
  testable failure.
- **Society's first link: essential shortages raise unrest.** Unrest is bounded
  and mean-reverting (moved toward `shortages × UNREST_PER_SHORTAGE`, capped at
  0.6) instead of a random walk; crime keeps its old random walk until the full
  chain lands in Phase 4b.
- **`FORMAT_VERSION` 4 → 5.** Market entries, town population, and the pricing
  model all changed shape; old saves are rejected.

## Phase 4b — shocks, traders, society, report

- **Two trader populations.** `TRADERS_PER_COUNTY = 3` merchants live in each
  county and `TRADERS_PER_HOUSE = 3` in each merchant house (18 total). They are
  ordinary people with `isTrader` set and a 150–400 starting purse; from then on
  the trader system in `npc.ts` decides their actions every day. They submit
  through the same `submitCommand` path as the player but with `log = false`:
  stepping the sim reproduces their decisions deterministically, and logging
  them would make a command-log replay apply each trade twice.
- **Traders act on an honest, whole-load quote — same math as the player.** A
  trader's plan prices the entire load at its true realized average (drain a
  market and later units cost more; fill it and later units fetch less), via
  closed-form `sumMultipliers` instead of a per-unit loop, so the hot path stays
  O(1). A trade that would crash a small market is worth only what it truly
  fetches. This matters to the player too: the trader and the player fight for
  the same markets, so "the player's marginal price is the honest price" had to
  be true for traders as well.
- **Traders size each trip to its profit after both tolls.** `planTraderBuy`
  compares realized proceeds at the resale town (found by a fresh Dijkstra over
  roads in `TRADER_RANGE = 20`) minus the realized bill minus the round-trip
  tolls, and skips anything under `TRADER_MIN_MARGIN = 2`. `TRADER_BUY_SAFETY =
  0.9` keeps 10% of cash clear of a single order.
- **NPCs re-check the market is still theirs before committing.** All traders
  plan against one day-start snapshot, but they act in sequence, so the first
  trader to drain a source can raise the price the next one pays. Before
  submitting, a trader re-quotes the planned load at the live market and stands
  down unless the full load still fits its budget — it never issues an order
  that would fail validation (a failure would waste the trip), and never carries
  a shrunken load across both tolls (a guaranteed loss). A Phase 4b test enforces
  "no `trade-failed`/`travel-failed` outcome ever has a trader as its actor."
- **A trader's reach map is its planning knowledge.** Every town within 20
  road-days reachable over *open* roads (flooded roads are skipped, exactly as
  `shortestPath` treats them, so a planned route can never fail to resolve). It
  is cached per snapshot and shared by all traders that day; the flood-skip
  rule is enforced by a test. Until fog exists, traders see true prices and
  routes — a knowledge stand-in recorded here so Phase 5 can replace it.
- **Shocks: drought, good harvest, flood, plague.** Each has a seeded daily
  chance (`0.006`/`0.005`/`0.005`/`0.004`) and a duration band (drought and
  harvest 60–120 days, flood 20–60, plague 30–60). Drought scales a county's
  grain production ×0.4, harvest ×1.4, plague scales a county's medicine need ×2,
  and a flood closes its road for the duration. Shocks run last in the tick so
  they observe the day they spawned into; expired shocks are culled and a
  flooded road reopens when its shock clears. The world is always connected
  because town pairs across components are joined at worldgen, so a flood
  slows a route, never severs the country.
- **The import floor stopped being the starvation line.** With drought and
  plague in, the old `IMPORT_FLOOR_DAYS = 3` floor was keeping whole counties
  at the famine floor for 30+ days at a stretch — the stockout target measured
  exactly that. Provisioning now triggers on `production < consumption` for any
  essential (crime and shocks included) and restocks at `IMPORT_PROVISION_RATE =
  1.25×` toward the 15-day provision line, capped at target. A low-yield grain
  town or a drought-hit county is chronically dear (prices near 2× base — the
  dry county's grain price gap vs. un-droughted neighbors is the drought's
  visible mark) but never starves, because it genuinely imports its shortfall;
  the hard 3-day floor remains as the ceiling of "how wrong even a fully blocked
  town can get". Plague still bites: a county's doubled medicine need outpaces
  the 1.25× provision, so medicine genuinely runs short during one.
- **Society's first real chain: shortages → unrest → crime → worse yields.**
  `SHORTAGE_RATIO = 0.5` of target triggers a shortage; unrest converges toward
  `shortages × 0.1`, capped at 0.6, at 5%/day. Crime chases unrest (`×0.8`, 4%
  revert), and the economy trims a town's output by up to `CRIME_PRODUCTION_CUT
  = 0.2 × crime` the next day. The checkpoint report caps crime at ~0.2 and
  unrest at ~0.19 even with live traders, so the numbers stay tame.
- **`TRADER_STAGGER = 1`.** Every trader decides every day. The cost is a
  heavier hot path (one Dijkstra + whole-load quotes per trader per day); the
  win is liveliness: ~13,500 buy and ~13,500 sell orders over 50 years, and both
  margins compress. The 2 ms/day checkpoint budget still passes.
- **"NPCs visibly compress margins" is measured head to head, not over time.**
  An early-vs-late margin trend stays flat under provisioning because the
  provision line pins the deficit-town price at ~2× forever. The honest test is
  the same 50-year world run twice — once with traders, once with all 18
  disabled — and comparing cross-town price dispersion (`mean |price − 1|`): the
  trader world ends at 0.703 vs 0.848 without them. Disabling traders consumes
  no rng, so the two worlds share every economy/society/shock draw and differ
  only in what commerce does. The sim:report prints the head-to-head.
- **Simplicity over cleverness in the report.** Bots are 60 lines of greedy
  planner code over `game.send`, chosen because they are readable in the report
  and exercise the exact public command API a player uses; each bot's wealth
  series is the 720-day checkpoint. The full checkpoint runs ~15 s and every
  Phase 4 target passes: prices in bounds, no bad stock, 2.7% stockouts
  (< 5%), careful bot ~1900 cash (target 400+), careless bot loses, margins
  compress, 0.8 ms/day (< 2).
- **`FORMAT_VERSION` 5 → 6.** Shocks, `isTrader`, crime, and the provision
  fields changed shape; old saves are rejected.

## Phase 3 — world shape, roads, travel time

- **Travel is a journey, not an instant jump.** A `travel` command plans a
  route with Dijkstra over open roads, sets `person.journey`, and sets
  `location = null` — the traveller leaves town. The journey completes in `tick`
  on its arrival day, paying the route toll. There is no mid-journey redirect:
  a second travel command while on the road is a typed `travel-failed`. The
  movement system runs **before** commands each day, so a traveller who arrives
  in the morning can trade in that town by noon — but a command dated the
  arrival day fires after arrival, which is the intuitive trade.
- **Tolls cannot send a traveller into debt.** On arrival the toll is capped at
  the traveller's cash; the shortfall is simply not paid. A broke traveller
  still arrives. (NPC solvency rules arrive with the traders in Phase 4b.)
- **The road network is structural, not random.** Each county gets a spanning
  tree over its towns plus 1–2 extra seeded loops; counties are then joined by
  closest-town-pair edges that need no rng, so the country is **always one
  component** (tested over 50 seeds). `travelDays = ceil(length / ROAD_SPEED)`,
  `toll ≈ length × TOLL_PER_UNIT`. Roads carry `status` now; floods arrive in
  Phase 4b.
- **The carry limit binds everyone equally.** `buy` fails cleanly (a typed
  `trade-failed`) rather than clamping the quantity, staying consistent with
  the validation-first command model. `CARRY_CAPACITY = 60` weight units;
  per-good weights make timber and iron bind faster than tea and medicine. The
  player starts with 10 grain, so 50 weight units are free on day one.
- **Road danger is read-only for now.** `RoadSnapshot.danger` is the average
  crime of the two endpoint towns, shown to the map; fog-gating it is Phase 5.
  As reserved earlier, `shortestPath` plans over true open roads — a small,
  known omniscience the player does not yet have.
- **`FORMAT_VERSION` 3 → 4.** World shape changed: roads, journeys, county
  bounds, the road counter, and good weights. Old saves are rejected.

## Phase 2 — actors, commands, time

- **`Game.send(actor, spec)` is the single entry point for commands.** The old
  `send(command)`/`enqueue(command)` pair is gone. `send` assigns
  `id = cmd-${counters.command++}` (so the id embeds the submission order),
  defaults `day = world.day`, applies a command that is already due
  synchronously in submission order (a paused game reacts instantly), and
  queues a future-dated one for its day. Player and AI go through the same
  method, so ordering and determinism have exactly one implementation.
- **Every submission is logged for replay.** `send` appends
  `{ day: world.day, order, command }` to `world.commandLog`, which is part of
  the serialized world. Replay is then self-contained: read the log, re-submit
  each entry through `send`, get the identical state. The log grows with the
  run; when NPC traders arrive in Phase 4b and pre-history runs in Phase 6,
  revisit the size (cap it or keep it out of the save) before it bloats saves.
- **`Outcome.actorId` is the acting person's id.** The snapshot's
  `player.ledger` is the player's last ≤30 outcomes, filtered by that id and
  newest first — NPC activity stays in `world.history` but never leaks into the
  ledger. Failures caused by the player's own commands carry the player id (so
  the player sees why a trade failed); failures of an unresolvable actor carry
  `null`, which never matches the player.
- **`FORMAT_VERSION` 2 → 3.** The world shape changed (`commandLog`,
  `Outcome.actorId`, `PersonSnapshot.familyRole`), so old saves are rejected
  with the clear "unsupported save format" message. No migration.

## Phase 1b — UI foundation

- **The broken-menu root cause was `$state.raw`, not the menu logic.** The
  old store was one `$state.raw({...})` object; `$state.raw` keeps the object
  non-reactive, so writing `openPanels = [...]` or `paused = ...` never
  scheduled a re-render and the buttons looked dead. The store is now a class
  whose small fields are individually `$state` (mode, paused, openPanel, …)
  and whose snapshot is `$state.raw`, replaced whole on each publish. The
  fix is recorded for the same reason the failing test exists: it took a
  real bug, not a guess, to move the store to per-field reactivity.
- **The HUD headless route imports no engine module.** `?hud=standalone` and
  the UI test suite mount Svelte over a bare `Game` and must not drag
  `@dylanebert/shallot` into the node process (it does not load there).
  So save/load/new-game persistence lives in `lib/persistence.ts`
  (sim + store only) and the engine-coupled `hud-bridge.ts` is imported only
  by the real engine path. Engine republish after load/new-game happens
  through the store's `onSimReplaced` bridge hook.
- **UI test dependencies are dev-only.** `vitest`, `happy-dom`, and the Svelte
  test harness live in `apps/game` devDependencies; nothing ships to the
  browser. A `resolve.conditions: ["browser", ...]` in `vitest.config.ts`
  makes bare `svelte` resolve to its client entry so `mount` works; sim tests
  use bun's test runner as before.
- **One docked panel at a time.** `WindowManager` and floating-window drag
  logic are deleted. Clicking a disabled nav item opens an honest
  "Not yet available" stub rather than hiding the entry.

## Reserved for later phases

- Phase 3: no random road robbery in v0.1 (road travel is costly only in
  days and tolls).
- Phase 5: `shortestPath` plans over true open roads — a small, known
  omniscience the player does not have.

