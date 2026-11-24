<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { formatMoney } from "../lib/format";
    import Button from "../components/ui/Button.svelte";
    import EmptyState from "../components/ui/EmptyState.svelte";
    import ExplainedNumber from "../components/ui/ExplainedNumber.svelte";
    import PanelFrame from "./PanelFrame.svelte";

    // Per-good quantity inputs, kept in component-local state.
    let qty = $state<Record<string, number>>({});

    function trade(kind: "buy" | "sell", goodId: string): void {
        const snap = game.snapshot;
        if (!snap || !snap.player.location) return;
        const quantity = Math.max(1, Math.floor(qty[goodId] ?? 1));
        // Commands are the single shared interface; the sim assigns the id and
        // applies a due command immediately, so the HUD reflects the trade at once.
        game.sendCommand({ kind: "player" }, { kind, good: goodId, at: snap.player.location, quantity });
    }

    function roundMoney(n: number): string {
        return Math.round(n).toLocaleString("en-US");
    }

    function heldCount(stock: Record<string, number>): number {
        return Object.values(stock).reduce((sum, qty) => sum + qty, 0);
    }
</script>

{#if game.snapshot}
    {@const snap = game.snapshot}
    {@const at = snap.player.location}
    {@const town = at === null ? null : (snap.towns.find((t) => t.id === at) ?? null)}
    <PanelFrame
        title="Trade"
        numbers={[
            { label: "Cash", value: formatMoney(snap.player.cash), tone: "gold" },
            { label: "Goods held", value: String(heldCount(snap.player.stock)) },
        ]}
        tabs={[{ id: "market", label: "Market" }]}
    >
        {#snippet content()}
            {#if town === null}
                <EmptyState>You are between towns. Trading happens inside a town.</EmptyState>
            {:else}
                <p class="where">Market of {town.name}, base prices from the town ledger.</p>
                {#each snap.goods as good (good.id)}
                    {@const entry = town.goods[good.id]!}
                    {@const held = snap.player.stock[good.id] ?? 0}
                    <div class="good-row">
                        <div class="gname">
                            <span class="name">{good.name}</span>
                            <span class="held">held {held}</span>
                        </div>
                        <ExplainedNumber price={entry.market} format={roundMoney} />
                        <input
                            class="qty"
                            type="number"
                            min="1"
                            value={qty[good.id] ?? 1}
                            oninput={(e) => (qty[good.id] = Number((e.target as HTMLInputElement).value))}
                            aria-label="Quantity of {good.name}"
                        />
                        <Button kind="primary" onclick={() => trade("buy", good.id)}>Buy</Button>
                        <Button onclick={() => trade("sell", good.id)} disabled={held <= 0}>Sell</Button>
                    </div>
                {/each}
            {/if}
        {/snippet}
    </PanelFrame>
{/if}

<style>
    .where {
        margin: 0 0 6px;
        font-size: 12px;
        color: var(--paper-dim);
    }

    .good-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
        border-bottom: 1px solid var(--line);
    }

    .gname {
        display: flex;
        flex-direction: column;
        flex: 1;
    }

    .name {
        font-weight: 500;
        color: var(--paper);
    }

    .held {
        font-size: 11px;
        color: var(--paper-faint);
    }

    .qty {
        width: 56px;
        min-height: 32px;
    }
</style>
