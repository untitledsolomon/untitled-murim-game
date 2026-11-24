<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { formatDay } from "../lib/format";
    import { MINIMAP_MARGIN, MINIMAP_SIZE, NAV_HEIGHT } from "../lib/layout";
    import Button from "./ui/Button.svelte";
    import Stat from "./ui/Stat.svelte";
</script>

{#if game.showDebug}
    <section class="debug-panel" style="bottom: calc({NAV_HEIGHT}px + {MINIMAP_SIZE + MINIMAP_MARGIN * 2}px);" aria-label="Debug">
        <h3 class="dhead">DEBUG</h3>
        {#if game.snapshot}
            <div class="stats">
                <Stat label="Seed" value={String(game.snapshot.seed)} />
                <Stat label="Day" value={formatDay(game.snapshot.day)} />
                <Stat label="ms/day" value={game.lastMsPerDay > 0 ? game.lastMsPerDay.toFixed(3) : "—"} />
            </div>
            <div class="row">
                <Button onclick={() => game.stepSim(30)}>Skip 30 days</Button>
                <Button onclick={() => game.stepSim(365)}>Skip 1 year</Button>
            </div>
            <label class="toggle">
                <input
                    type="checkbox"
                    checked={game.revealAll}
                    onchange={(e) => game.setRevealAll((e.target as HTMLInputElement).checked)}
                />
                <span>Reveal all (fog off)</span>
            </label>
        {/if}
        {#if game.snapshot && game.snapshot.shocks.length > 0}
            <ul class="shocks">
                {#each game.snapshot.shocks as shock (shock.id)}
                    <li>
                        {shock.kind.replace("_", " ")} on {shock.targetLabel}, {shock.daysLeft}d left
                    </li>
                {/each}
            </ul>
        {:else}
            <p class="none">Active shocks: none right now.</p>
        {/if}
    </section>
{/if}

<style>
    .debug-panel {
        position: absolute;
        left: 12px;
        width: 280px;
        padding: 8px 10px;
        background: var(--ink);
        border: 1px solid var(--danger);
        border-radius: var(--panel-radius);
        box-shadow: var(--shadow);
        z-index: var(--z-dock);
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: auto;
    }

    .dhead {
        margin: 0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--danger);
    }

    .stats {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .row {
        display: flex;
        gap: 6px;
    }

    .toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--paper-dim);
        font-size: 12px;
    }

    .toggle input {
        margin: 0;
    }

    .none {
        margin: 0;
        font-size: 11px;
        color: var(--paper-faint);
    }

    .shocks {
        margin: 0;
        padding: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 11px;
        color: var(--paper-dim);
        text-transform: capitalize;
    }
</style>
