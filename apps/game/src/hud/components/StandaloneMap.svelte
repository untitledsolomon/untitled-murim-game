<script lang="ts">
    import { WORLD_SIZE } from "@murim/sim";
    import { game } from "../lib/game-state.svelte";
    import { DOCK_WIDTH, NAV_HEIGHT, TOPBAR_HEIGHT } from "../lib/layout";

    // Headless stand-in for the WebGPU map: a plain projection of the world
    // into the free map area. Used by ?hud=standalone and the UI tests.
    function screenX(x: number): number {
        return (x / WORLD_SIZE) * Math.max(1, window.innerWidth - DOCK_WIDTH);
    }

    function screenY(y: number): number {
        return (y / WORLD_SIZE) * Math.max(1, window.innerHeight - TOPBAR_HEIGHT - NAV_HEIGHT) + TOPBAR_HEIGHT;
    }

    function dotClick(id: string): void {
        if (game.selectedTownId === id) {
            game.selectTown(null);
        } else {
            game.selectTown(id);
            game.openPanelById("town");
        }
    }
</script>

<div class="standalone-map">
    {#if game.snapshot}
        {#each game.snapshot.towns as t (t.id)}
            <button
                class="standalone-dot"
                class:selected={game.selectedTownId === t.id}
                style="left: {screenX(t.position[0])}px; top: {screenY(t.position[1])}px;"
                title={t.name}
                aria-label={t.name}
                onclick={() => dotClick(t.id)}
            >
                {t.name}
            </button>
        {/each}
    {/if}
</div>

<style>
    .standalone-map {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: var(--z-dots);
    }

    .standalone-dot {
        position: absolute;
        transform: translate(-50%, -50%);
        pointer-events: auto;
        padding: 2px 5px;
        border-radius: 999px;
        background: var(--ink-2);
        border: 1px solid var(--line-strong);
        color: var(--paper-dim);
        font-size: 11px;
    }

    .standalone-dot:hover {
        color: var(--gold);
        border-color: var(--gold);
    }

    .standalone-dot.selected {
        color: var(--gold);
        border-color: var(--gold);
        background: var(--ink-3);
    }
</style>
