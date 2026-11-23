<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { formatMoney } from "../lib/format";
    import PanelFrame from "./PanelFrame.svelte";

    function goodsName(id: string): string {
        return game.snapshot?.goods.find((g) => g.id === id)?.name ?? id;
    }

    function townName(id: string): string {
        return game.snapshot?.towns.find((t) => t.id === id)?.name ?? id;
    }
</script>

{#if game.snapshot}
    {@const snap = game.snapshot}
    <PanelFrame title="Trade" tabs={[{ id: "goods", label: "Goods" }]}>
        {#snippet content()}
            {#each snap.goods as good (good.id)}
                {@const cheapest = snap.towns
                    .filter((t) => t.goods[good.id])
                    .sort((a, b) => a.goods[good.id]!.market.value - b.goods[good.id]!.market.value)[0]}
                <div class="good">
                    <span class="gname">{goodsName(good.id)}</span>
                    <span class="gbest">
                        {#if cheapest}
                            cheapest at {townName(cheapest.id)}: {formatMoney(cheapest.goods[good.id]!.market.value)}
                        {:else}
                            no market data
                        {/if}
                    </span>
                </div>
            {/each}
        {/snippet}
    </PanelFrame>
{/if}

<style>
    .good {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 4px 0;
        border-bottom: 1px solid var(--line);
        font-size: 12px;
    }

    .gname {
        font-weight: 500;
        color: var(--paper);
    }

    .gbest {
        color: var(--paper-dim);
        font-variant-numeric: tabular-nums;
    }
</style>
