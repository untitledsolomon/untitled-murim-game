<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { formatMoney } from "../lib/format";
    import PanelFrame from "./PanelFrame.svelte";

    function goodsName(id: string): string {
        return game.snapshot?.goods.find((g) => g.id === id)?.name ?? id;
    }
</script>

{#if game.snapshot}
    {@const banks = game.snapshot.organizations.filter((o) => o.kind === "bank")}
    {@const cash = game.snapshot.player.cash}
    {@const wealth = game.snapshot.measures?.wealth.value ?? cash}
    <PanelFrame
        title="Banking"
        numbers={[
            { label: "Cash", value: formatMoney(cash), tone: "gold" },
            { label: "Wealth", value: formatMoney(wealth) },
        ]}
        tabs={[{ id: "banks", label: "Banking houses" }]}
    >
        {#snippet content()}
            {#if banks.length === 0}
                <p class="muted">No banking houses yet in this world.</p>
            {:else}
                {#each banks as bank (bank.id)}
                    <div class="bank">
                        <div class="bhead">
                            <span class="bname">{bank.name}</span>
                            <span class="brep">{Math.round(bank.reputation.value)}</span>
                        </div>
                        {#if bank.holdings.length > 0}
                            <div class="holdings">
                                {#each bank.holdings as h}
                                    <span class="holding">{goodsName(h.good)} {h.quantity} × {formatMoney(h.value.value)}</span>
                                {/each}
                            </div>
                        {:else}
                            <span class="muted">No holdings reported.</span>
                        {/if}
                    </div>
                {/each}
            {/if}
        {/snippet}
    </PanelFrame>
{/if}

<style>
    .muted {
        color: var(--paper-dim);
    }

    .bank {
        padding: 6px 0;
        border-bottom: 1px solid var(--line);
    }

    .bhead {
        display: flex;
        justify-content: space-between;
        gap: 12px;
    }

    .bname {
        font-weight: 500;
        color: var(--paper);
        font-size: 13px;
    }

    .brep {
        color: var(--gold);
        font-variant-numeric: tabular-nums;
    }

    .holdings {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 12px;
        margin-top: 3px;
    }

    .holding {
        font-size: 11px;
        color: var(--paper-dim);
    }
</style>
