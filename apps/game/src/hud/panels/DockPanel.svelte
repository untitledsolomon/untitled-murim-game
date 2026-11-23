<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { DOCK_WIDTH, NAV_HEIGHT, TOPBAR_HEIGHT } from "../lib/layout";
    import { PANELS } from "./registry";
    import NotYetAvailable from "./NotYetAvailable.svelte";
</script>

{#if game.openPanel}
    {@const def = PANELS.find((p) => p.id === game.openPanel)}
    {#if def}
        <section
            class="dock"
            aria-label={def.title}
            style="top: {TOPBAR_HEIGHT}px; right: 0; bottom: {NAV_HEIGHT}px; width: {DOCK_WIDTH}px;"
        >
            <header class="dock-head">
                <span class="dtitle">{def.title}</span>
                <button class="dclose" type="button" aria-label="Close panel" onclick={() => game.closePanel()}>
                    ✕
                </button>
            </header>
            <div class="dock-body">
                {#if def.enabled}
                    {@const Cmp = def.component}
                    <Cmp />
                {:else}
                    <NotYetAvailable title={def.title} />
                {/if}
            </div>
        </section>
    {/if}
{/if}

<style>
    .dock {
        position: absolute;
        display: flex;
        flex-direction: column;
        background: var(--ink);
        border-left: 1px solid var(--line);
        box-shadow: var(--shadow);
        z-index: var(--z-dock);
    }

    .dock-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 10px;
        border-bottom: 1px solid var(--line);
        background: var(--ink-2);
    }

    .dtitle {
        color: var(--gold);
        font-weight: 600;
        letter-spacing: 0.03em;
    }

    .dclose {
        min-width: 32px;
        min-height: 32px;
        color: var(--paper-dim);
        font-size: 15px;
        background: none;
        border: none;
    }

    .dclose:hover {
        color: var(--paper);
    }

    .dock-body {
        flex: 1;
        overflow: hidden;
    }
</style>
