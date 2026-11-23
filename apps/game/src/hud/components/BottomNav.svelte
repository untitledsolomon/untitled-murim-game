<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { NAV_HEIGHT } from "../lib/layout";
    import { PANELS } from "../panels/registry";

    function pick(id: string): void {
        game.togglePanel(id);
    }
</script>

<nav class="bottom-nav" aria-label="Main menu" style="height: {NAV_HEIGHT}px;">
    {#each PANELS as p, i (p.id)}
        <button
            class="nav-item"
            class:active={game.openPanel === p.id}
            class:disabled={!p.enabled}
            onclick={() => pick(p.id)}
            aria-expanded={game.openPanel === p.id}
        >
            <span class="label">{p.title}</span>
            {#if !p.enabled}<span class="later">(later)</span>{/if}
        </button>
        {#if i === 4}<span class="divider"></span>{/if}
    {/each}
</nav>

<style>
    .bottom-nav {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: stretch;
        background: var(--ink);
        border-top: 1px solid var(--line);
        z-index: var(--z-nav);
    }

    .nav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        min-height: 32px;
        padding: 4px 2px;
        color: var(--paper-dim);
        background: none;
        border: none;
        border-right: 1px solid var(--line);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .nav-item:hover:not(.disabled) {
        color: var(--paper);
    }

    .nav-item.active {
        color: var(--gold);
        background: var(--ink-2);
        box-shadow: inset 0 2px 0 var(--gold);
    }

    .nav-item.disabled {
        color: var(--paper-faint);
    }

    .later {
        font-size: 10px;
        color: var(--paper-faint);
    }

    .divider {
        width: 6px;
        background: var(--ink-2);
        border-right: 1px solid var(--line);
    }
</style>
