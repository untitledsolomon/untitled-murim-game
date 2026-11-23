# Murim Merchant Sim: Design Document (Working Title)

Solomon · Draft v0.1 · 23 November 2026

## 1. Vision

A grounded simulation game set in murim-era China, where the player is one individual in a living, connected world. The player may found a martial sect, a merchant house, a bank, an escort agency, an intelligence network, or any mix of these, and may also enter government. There is no forced path, no main character, and no guaranteed success. The world runs on its own, and the player lives with the consequences of their own actions and of everyone else's.

The project is meant to be played, and over time it should also work as a simulation engine that can model real-world concepts. It is deliberately not "gamey".

**Reference points:** Kenshi (the player is just another life in the world), Victoria 3 (connected economy, pops, map modes, pause and speed controls), Plutocracy and the Civ games (feature-rich with a simple interface), and murim manhwa and novels (merchant groups tied to sects and alliances).

## 2. Design Pillars

1. **Living world.** The world simulates itself. A bad official, a famine, or a sect war affects neighbours whether or not the player is involved.
2. **Free path.** The player is never locked into one career. Sect, trade, banking, intelligence, politics, and crime are all open.
3. **Same rules for everyone.** NPC organizations and rivals can do everything the player can: found businesses, assassinate, betray, and be betrayed. Nobody cheats, and the player can be assassinated.
4. **Skill over luck.** Outcomes come from inputs (training, numbers, preparation, terrain, information), not dice. Uncertainty comes from incomplete information.
5. **Transparent rules, uncertain world.** The player can always see why a number is what it is. What they cannot always see is what is happening in places their network does not reach.
6. **Consequences and legacy.** Choices persist across generations. Heirs inherit assets, debts, enemies, and reputation.

## 3. Setting

- **Era and place:** Murim-era China, with a single procedurally generated country in the first version. More countries or continents may come later.
- **Technology:** Pre-gunpowder weapons dominate. Bombs exist but are expensive, uncommon, and controlled, which makes them a scarce good with a supply chain, a black market, and political attention.
- **Martial arts:** Grounded. Fighters are exceptionally trained people. A master can be defeated by numbers, ambush, poison, or poor information. The murim feel comes from schools, lineages, rankings, honour codes, escort agencies, and the orthodox versus black-path divide, not from supernatural powers.
- **Lifespan:** About 70 to 80 years, with normal aging, illness, and natural death.
- **Named organizations:** The Hao Sect, an information sect in the style of the Beggars' Sect, exists in the world. Placement is procedural.

## 4. Core Model: Organizations

Everything that acts in the world is an organization: sects, merchant houses, banks, escort agencies, government offices, and the player's own group. No organization has a fixed type. A label such as "sect" or "merchant house" emerges from what it does.

Every organization is defined by five things:

- **Members:** key figures with roles, loyalty, skills, and ambitions.
- **Holdings:** money, properties, businesses, goods, caravans, manuals and techniques.
- **Capabilities:** the activities it has built up (trade, martial training, escort work, intelligence, politics, banking, crime).
- **Relationships:** alliances, debts, rivalries, tribute, and hostility toward each other organization, tracked separately.
- **Reputation:** how different groups (merchants, officials, sects, commoners) see it. Reputation can differ by audience and can be wrong.

A succession custom (hereditary, designated by the head, chosen by elders, or contested) is also part of an organization's data, so different groups can differ and a player can change the custom with consequences.

NPC organizations use the same structure and the same commands as the player. They differ only by goals and temperament (cautious, expansionist, ruthless, honourable).

## 5. The Player

- **An individual, not a ruler.** The player controls one character, who physically travels the map. Travel takes time and carries risk.
- **Starting options:** the player chooses from a set of backgrounds, generated from the actual world. Each has assets, skills, relationships, obligations, and one built-in weakness, so no option is simply best. Examples: merchant's heir, escort's child, disgraced disciple, magistrate's clerk, street informant, and nobody (hardest).
- **Family:** some options begin with a family, and some begin alone. Players who start alone must build a line through marriage or adoption.
- **Starting inside a succession:** one option is to begin as a family member of an existing organization, as a contender in its succession battle.
- **Detail level for cities:** a city is a set of districts with named buildings and businesses shown as cards. Streets are not simulated.

## 6. World, Time, and Difficulty

### World generation

The world is procedural and seeded, so the same seed always produces the same world. Generation works from geography outward:

1. Terrain: mountains, rivers, plains, coastline, passes.
2. Settlements placed where rivers, crossroads, harbours, and farmland make them viable.
3. Resources by land: grain, salt, iron, timber, tea, and others, which create trade and make some starts stronger than others.
4. A government hierarchy: capital, provinces, prefectures, counties, with appointed officials.
5. Organizations placed to fit the land, each with a founding story and some existing rivalries or alliances.
6. Starting options generated from the resulting world.

### Pre-simulated history

After generation the simulation runs headless for decades before the player begins, so every world starts with history: families that rose or fell, grudges, debts, trade patterns, and succession tensions. This also serves as a test that the world sustains itself.

### Time

Real time with pause, resume, and five speeds, in the style of Victoria 3. A calendar in days. Target pace: roughly 10 to 15 hours of play per 70-year life, kept as a tunable setting. Three generations would be a campaign of about 30 to 45 hours.

### Difficulty

The player chooses a difficulty at world creation, with presets such as gentle, standard, and brutal. Because nobody cheats, difficulty comes from world hostility, resource scarcity, AI aggression and competence, event frequency, and reliability of information.

## 7. Systems

### 7.1 Economy and trade

- Each town has a local market with prices set by its own supply and demand. Routes connect towns with transport time, cost, and risk of robbery. Tolls and taxes apply.
- The first version uses a small essential goods set (grain, salt, cloth, tea, iron, medicine, timber), with nice-to-have goods later.
- Population is simulated in **groups** (size, occupation, wealth, needs, loyalty). Unmet needs create unrest, which connects to politics.
- **Key figures** (officials, representatives, leaders) are simulated as individuals, roughly 50 per county. A notable person can rise out of a group and fade back.
- Shocks such as harvests, floods, wars, and closed roads propagate across connected towns.
- Every price and rate carries its contributing factors so the interface can explain it.

### 7.2 Money, credit, and banking

- Silver and copper, loans, and drafts for moving value between towns.
- Players and NPCs can open banks. A bank takes deposits, lends at interest, and issues drafts. Deposits are liabilities, reserves are limited, and loans carry default risk.
- A bank's value rests on reputation. Rumours, failed loans, or robbed shipments can trigger a bank run.
- Heirs inherit debts and obligations as well as assets.

### 7.3 Politics and government

- Government is made of the same organizations as everything else. A county government has a magistrate, staff, a budget, and duties (justice, taxation, order). Higher levels appoint, review, and rotate officials.
- There are two layers of power. The magistrate is formal authority and is often an outsider who rotates. The clerks and runners hold local knowledge and informal control, and informal fees help finance local government. The player can cultivate either layer.
- A mismanagement chain: budget, then garrison and police strength, then crime, then unrest, then protests, then disrupted trade, then spillover to neighbouring counties. Each step is explainable.
- **The player can hold office.** Three routes are open: examinations, buying a title, and patronage. Officials are appointed, rotated, reviewed, and can be dismissed or exposed. Offices are not inherited, though a prominent parent leaves influence and connections.
- Player political actions include bribing, funding public works, exposing corruption, backing a rival's appointment, and taking on tax-farming contracts.
- Sects operate in grey zones that officials tolerate, use, or suppress. A coalition of orthodox sects can act as a political bloc.

### 7.4 Crime and the black path

Crime is a set of **activities any organization can do**, not a fixed faction: smuggling, extortion, banditry, and protection rackets. Each carries consequences. An organization earns a black-path reputation through its behaviour, so a legitimate merchant house can quietly smuggle.

### 7.5 Information

The full system is in scope from the start.

- **Fog by default.** The player sees only what their own people witness or report.
- **Every piece of information** records what it concerns, when it was observed, who reported it, and how reliable that source is. Its value fades with age.
- **Sources:** own members, businesses, and caravans; informants placed in rival organizations, officials' households, and markets; intelligence bought from organizations such as the Hao Sect; and public rumour, which is cheap but noisy.
- **Spy networks:** agents have a cover, skill, and loyalty. They can be recruited, turned, discovered, or killed.
- **Counter-intelligence:** detect enemy informants, run double agents, and plant false information. Rivals do the same.
- **Travel time:** information moves at the speed of couriers and roads.
- **Key rule:** every decision, by the player or by an NPC, reads from that actor's own knowledge, never from the true world state.

### 7.6 Martial system

- Sects are organizations whose main capability is training: a school with a lineage, a hierarchy of members, and a reputation.
- Individuals grow over years through training time, quality of teaching, and the techniques available to them.
- Techniques and manuals are holdings that can be copied, traded, stolen, or lost.
- Fights are **resolved from inputs** (skill, numbers, equipment, terrain, preparation, what each side knew), not a tactical minigame.
- Martial power has political weight: sects can protect, threaten, or be hired, and governments treat strong ones as both useful and dangerous.

### 7.7 Family and succession

- Family members are key figures with age, health, talent, temperament, loyalty, and ambition.
- Raising heirs is an activity: the player chooses how to invest in each child (examination study, martial training, business apprenticeship, political marriage), with results appearing years later.
- Marriage is politics, producing alliances, dowries, and obligations. Adoption and disciples are ways to bring in talent.
- Loyalty is visible and moves with events (favours, slights, debts, neglect). Betrayal is foreshadowed by readable signs.
- **Succession is a choice the player makes before death.** Options: designate an heir, give everything to the organization (so that whoever becomes head takes all and the organization stays whole), or leave it open as a contest. A contest can take the form of a merit trial, a council vote, or an unrestricted fight.
- **Contests** use the normal commands: winning member backing, gathering information, funding allies, or assassinating rivals. Rival organizations can interfere.
- If the head dies without a choice, the organization's own succession custom decides, which usually means a contest.
- **Who the player controls:** in a contested succession the player picks one surviving child to control while the others are AI. If that contender dies or loses, the player can switch to another surviving family member. If the whole family line is gone, the run ends with a legacy score.
- **Exits:** there is no way to escape past choices. The only exits are leaving the entire family or ending the run.
- Designations can be public or secret, and leaks matter.
- Personal and family wealth is distinct from an organization's holdings. Moving assets into the organization is hard to reverse.

### 7.8 AI behaviour

- Each organization has goals, a temperament, resources, and its own knowledge, and picks from the same commands the player uses.
- Decisions are made periodically, with evaluations staggered to spread cost.
- Organizations remember favours, slights, and debts. Key figures' traits (ambition, loyalty) drive betrayals and succession fights.
- Level of detail by distance: organizations near the player or of high importance get detailed decision-making, while distant minor ones use a simpler model. This must be tuned so distant events still have consequences that reach the player.
- Long no-player test runs (for example 100 simulated years) check that the economy stays plausible and the world does not collapse or stagnate.

## 8. Goals and Measures

There are no explicit win or lose conditions. The player chooses goals such as becoming the richest person or the most influential, in the manner of the Guild series and Plutocracy. The first version tracks three core measures: **wealth, influence, and political power.** Martial strength contributes to influence. When a family line ends, a **legacy score** summarizes wealth, influence, and how long the line lasted.

## 9. Interface

**Visual direction:** flat and clean, in the manner of Plutocracy.

**Always on screen:** the map with a mode switcher (prices, crime, unrest, influence, what you know); a top bar with the date, pause and speed controls, and the three core measures; an alerts feed; and an outliner of what needs attention.

**Panels opened from the map or bar:** you and your family; organization; town or district; trade; information; politics; banking; martial; and succession when relevant.

**Rules:**

- Every panel follows the same layout pattern: a header, a few key numbers, and tabs.
- Every number can be hovered to show what feeds it, and those inputs can be hovered in turn.
- Summaries come first, and details only on hover or click.
- Transparency of rules never reveals hidden world state. Fog is part of the game.

## 10. Technical Direction

- **Engine:** Shallot (a WebGPU engine, v0.10.5 at the time of review, which should be pinned) for the world and map. It provides world-space UI, a minimap camera, built-in time scaling for pause and speed, headless stepping for tests, and a save-and-load example.
- **Panels:** DOM-based UI (Svelte, following Shallot's hud example) overlaid on the canvas, since dense panels, tables, and tooltips suit HTML and CSS.
- **Simulation core:** a separate package with no engine or UI imports, deterministic with seeded randomness and fixed ticks, able to run headless.
- **Explainable numbers:** every computed value returns the value plus its contributing factors.
- **Interface to the simulation:** the UI reads snapshots and sends commands. The simulation does not know the UI exists.
- **Shared commands:** player actions and AI actions use one command system.
- **Packaging:** the game runs in a browser engine first. Electron or a similar shell can be added later for distribution.
- **Risk:** Shallot is pre-1.0 and its API may change, so upgrades should be deliberate.

## 11. Milestones

The first playable build uses a handful of counties of the one country, then scales up.

1. **Design document** (this document), kept updated.
2. **UI shell on mock data:** the Shallot map, camera, minimap, time controls, top bar, panel framework, and map modes, with panels built against the same data shapes the simulation will provide.
3. **Simulation core, headless:** world model, organizations, key figures, population groups, tick system, determinism, explainable numbers, and tests.
4. **World generation and pre-simulated history,** with seeds.
5. **Economy and trade.**
6. **Politics, offices, and crime.**
7. **Information system.**
8. **Martial, family, and succession.**
9. **Banking, AI tuning, difficulty, and starting options,** then balancing with long no-player runs.

Steps 5 to 8 can be reordered once early steps show how the work goes.

## 12. Open Questions

- Final game title.
- How many counties make up the full country, and how many in the first playable slice.
- The exact essential goods list and their properties.
- The combat resolution formula and how martial skill is measured.
- Marriage, dowry, and adoption rules in detail.
- How deep the examination system goes and how the buy-a-title route is priced and limited.
- What "leaving the family" costs and what the player has afterwards.
- The age at which the player starts.
- The exact time pace, to be tuned by testing.
- How level-of-detail AI is tiered, and what keeps distant events consequential.
- Bomb rules: supply chain, cost, legality, and accident risk.
- Bank-run and credit mechanics in detail.
- The Hao Sect's exact role, placement rules, and services.
- Art direction details within the flat and clean style.
- Save and load design, and distribution plans.

## 13. Glossary

- **Organization:** any acting group in the world, defined by members, holdings, capabilities, relationships, and reputation.
- **Key figure:** an individually simulated person.
- **Group (pop):** a statistically simulated collection of civilians sharing occupation, wealth, and needs.
- **Black path:** crime-related activities and the reputation they earn.
- **Hao Sect:** an information-focused sect in the style of the Beggars' Sect.
- **Yamen:** the office of a local official, staffed by clerks and runners.
- **Biaoju:** an armed escort agency that protects goods and travellers.
- **Piaohao:** a private remittance and banking house that moves money by drafts.
- **Succession custom:** an organization's rule for choosing its next head.
- **Legacy score:** the summary shown when a family line ends.
- **Pre-simulated history:** the decades of headless simulation run before the player starts.

## 14. Research Notes

- Shanxi merchants created China's first private remittance banking system, whose banks moved large flows of money, including government tax transfers, across provinces.
- Merchant guildhalls served religious, social, and dispute-settling functions as well as commercial ones.
- Escort agencies worked like logistics companies, and their value rested on reputation: one lost shipment could ruin them.
- In late-imperial county government, the appointed magistrate was only the visible top. Clerks and runners did much of the daily work, and informal fees helped finance the office.
- In murim fiction such as The Youngest Son of the Eunhae Merchant Group, merchant groups are portrayed as rivals of, and suppliers to, martial alliances, with money set against martial power as the central tension.
