<script lang="ts">
    import { game } from "../lib/game-state.svelte";

    const kinds: Record<string, string> = {
        travel: "Travel",
        price: "Price",
        alert: "Alert",
        opportunity: "Opportunity",
    };

    // Show only the highest-priority items so the feed stays brief.
    const top = $derived(
        game.snapshot ? [...game.snapshot.outliner].sort((a, b) => b.priority - a.priority).slice(0, 6) : [],
    );
</script>

{#if top.length > 0}
    <div class="outliner" aria-label="Watch list">
        <div class="heading">To watch</div>
        {#each top as item (item.id)}
            <div class="item" title={item.label}>
                <span class="kind">{kinds[item.kind] ?? item.kind}</span>
                <span class="label">{item.label}</span>
            </div>
        {/each}
    </div>
{/if}

<style>
    .outliner {
        position: absolute;
        left: 12px;
        bottom: 14px;
        width: 240px;
        background: var(--ink);
        border: 1px solid var(--line);
        border-radius: var(--panel-radius);
        box-shadow: var(--shadow);
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        z-index: var(--z-topbar);
    }

    .heading {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--paper-faint);
        padding: 2px 4px 4px;
    }

    .item {
        display: flex;
        gap: 8px;
        align-items: baseline;
        padding: 3px 6px;
        border-radius: 2px;
        font-size: 12px;
        text-align: left;
    }

    .item:hover {
        background: var(--ink-2);
    }

    .kind {
        color: var(--gold-dim);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
    }

    .label {
        color: var(--paper-dim);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
