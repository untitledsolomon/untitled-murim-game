<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { setMapMode } from "../hud-bridge";

    const MODES = [
        ["prices", "Prices"],
        ["crime", "Crime"],
        ["unrest", "Unrest"],
        ["influence", "Influence"],
        ["knowledge", "Knowledge"],
    ] as const;
</script>

<div class="mode-switcher" role="tablist" aria-label="Map mode">
    {#each MODES as [id, label]}
        <button role="tab" aria-selected={game.mode === id} class:active={game.mode === id} onclick={() => setMapMode(id)}>
            {label}
        </button>
    {/each}
</div>

<style>
    .mode-switcher {
        position: absolute;
        top: 56px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 2px;
        background: var(--ink);
        border: 1px solid var(--line);
        border-radius: var(--panel-radius);
        padding: 2px;
        z-index: var(--z-topbar);
        box-shadow: var(--shadow);
    }

    button {
        padding: 4px 12px;
        border-radius: 2px;
        color: var(--paper-dim);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    button:hover {
        color: var(--paper);
    }

    button.active {
        background: var(--ink-3);
        color: var(--gold);
    }
</style>
