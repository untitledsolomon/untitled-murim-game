<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { selectTown } from "../hud-bridge";
    import { formatMoney } from "../lib/format";
    import PanelFrame from "./PanelFrame.svelte";

    function townName(id: string): string {
        return game.snapshot?.towns.find((t) => t.id === id)?.name ?? id;
    }

    function goodsName(id: string): string {
        return game.snapshot?.goods.find((g) => g.id === id)?.name ?? id;
    }
</script>

{#if game.snapshot}
    {@const snap = game.snapshot}
    {@const town = snap.towns.find((t) => t.id === game.selectedTownId) ?? null}
    <PanelFrame
        title={town ? `Town: ${town.name}` : "Town / district"}
        numbers={[
            { label: "Crime", value: town ? `${Math.round(town.crime * 100)}%` : "—", tone: town && town.crime > 0.5 ? "danger" : "default" },
            { label: "Unrest", value: town ? `${Math.round(town.unrest * 100)}%` : "—", tone: town && town.unrest > 0.5 ? "danger" : "default" },
        ]}
        tabs={[{ id: "markets", label: "Markets" }]}
    >
        {#snippet content()}
            {#if town === null}
                <p class="muted">Select a town on the map to inspect it.</p>
                <ul class="towns">
                    {#each snap.towns as t (t.id)}
                        <li>
                            <button class="town-link" onclick={() => selectTown(t.id)}>{t.name}</button>
                        </li>
                    {/each}
                </ul>
            {:else}
                {#each Object.entries(town.goods) as [goodId, good] (goodId)}
                    <div class="good-row">
                        <span class="gname">{goodsName(goodId)}</span>
                        <span class="gbase">base {Math.round(good.basePrice)}</span>
                        <span class="gprice">market {formatMoney(good.market.value)}</span>
                    </div>
                    {#if good.market.factors.length > 0}
                        <ul class="factors">
                            {#each good.market.factors as f (goodId + f.label)}
                                <li><span>{f.label}</span><span class="amt">{f.amount > 0 ? "+" : ""}{Math.round(f.amount)}</span></li>
                            {/each}
                        </ul>
                    {/if}
                {/each}
            {/if}
        {/snippet}
    </PanelFrame>
{/if}

<style>
    .muted {
        color: var(--paper-dim);
        margin-top: 0;
    }

    .towns {
        list-style: none;
        margin: 6px 0 0;
        padding: 0;
        columns: 2;
        column-gap: 16px;
        font-size: 12px;
    }

    .town-link {
        color: var(--paper);
    }

    .town-link:hover {
        color: var(--gold);
    }

    .good-row {
        display: flex;
        gap: 12px;
        align-items: baseline;
        padding: 4px 0 1px;
        border-bottom: 1px solid var(--line);
        font-size: 12px;
    }

    .gname {
        font-weight: 500;
        color: var(--paper);
        flex: 1;
    }

    .gbase,
    .gprice {
        color: var(--paper-dim);
        font-variant-numeric: tabular-nums;
    }

    .gprice {
        color: var(--gold);
    }

    .factors {
        list-style: none;
        margin: 0;
        padding: 2px 0 4px 12px;
        font-size: 11px;
        color: var(--paper-faint);
    }

    .factors li {
        display: flex;
        justify-content: space-between;
        gap: 12px;
    }

    .amt {
        color: var(--paper-dim);
        font-variant-numeric: tabular-nums;
    }
</style>
