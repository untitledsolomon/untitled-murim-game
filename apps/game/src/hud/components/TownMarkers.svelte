<script lang="ts">
    import { game } from "../lib/game-state.svelte";

    function dotClick(id: string): void {
        // Selecting a town on the map opens its panel in the dock.
        if (game.selectedTownId === id) {
            game.selectTown(null);
        } else {
            game.selectTown(id);
            game.openPanelById("town");
        }
    }
</script>

{#if game.snapshot}
    {@const townById = new Map<string, string>(game.snapshot.towns.map((t) => [t.id, t.name]))}
    {#each game.townScreens as s (s.id)}
        <button
            class="town-dot"
            class:selected={game.selectedTownId === s.id}
            style="left: {s.x}px; top: {s.y}px;"
            title={townById.get(s.id)}
            aria-label={townById.get(s.id)}
            onclick={() => dotClick(s.id)}
        ></button>
    {/each}
{/if}

<style>
    .town-dot {
        position: absolute;
        width: 12px;
        height: 12px;
        margin: -6px 0 0 -6px;
        border-radius: 50%;
        background: var(--paper);
        border: 2px solid var(--ink);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
        z-index: var(--z-dots);
    }

    .town-dot:hover {
        background: var(--gold);
    }

    .town-dot.selected {
        background: var(--gold);
        border-color: var(--gold);
        box-shadow: 0 0 0 2px var(--gold-dim), 0 1px 3px rgba(0, 0, 0, 0.6);
    }
</style>
