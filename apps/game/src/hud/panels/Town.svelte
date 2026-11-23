<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { formatMoney } from "../lib/format";
    import Button from "../components/ui/Button.svelte";
    import EmptyState from "../components/ui/EmptyState.svelte";
    import ExplainedNumber from "../components/ui/ExplainedNumber.svelte";
    import PanelFrame from "./PanelFrame.svelte";

    function townName(id: string): string {
        return game.snapshot?.towns.find((t) => t.id === id)?.name ?? id;
    }

    function goodsName(id: string): string {
        return game.snapshot?.goods.find((g) => g.id === id)?.name ?? id;
    }

    function select(id: string): void {
        game.selectTown(id);
    }

    function travelHere(to: string): void {
        const snap = game.snapshot;
        if (!snap || !snap.player.location) return;
        game.sendCommand({
            id: `ui-travel-${to}-${Date.now().toString(36)}`,
            actor: { kind: "player" },
            day: snap.day,
            kind: "travel",
            to,
        });
    }

    function roundMoney(n: number): string {
        return Math.round(n).toLocaleString("en-US");
    }
</script>

{#if game.snapshot}
    {@const snap = game.snapshot}
    {@const town = snap.towns.find((t) => t.id === game.selectedTownId) ?? null}
    {@const here = snap.player.location}
    <PanelFrame
        title={town ? `Town: ${town.name}` : "Town / district"}
        numbers={[
            { label: "Crime", value: town ? `${Math.round(town.crime * 100)}%` : "—", tone: town && town.crime > 0.5 ? "danger" : "default" },
            { label: "Unrest", value: town ? `${Math.round(town.unrest * 100)}%` : "—", tone: town && town.unrest > 0.5 ? "danger" : "default" },
        ]}
        tabs={[{ id: "town", label: "Town" }]}
    >
        {#snippet content()}
            {#if town === null}
                <EmptyState>Select a town on the map to inspect it.</EmptyState>
                <ul class="towns">
                    {#each snap.towns as t (t.id)}
                        <li class="town-row">
                            <button class="town-link" onclick={() => select(t.id)}>{t.name}</button>
                            <Button
                                onclick={() => travelHere(t.id)}
                                disabled={here === null || here === t.id}
                                title={here === null ? "You are between towns" : here === t.id ? "You are already here" : "Travel here now"}
                            >
                                {here === t.id ? "Here" : "Travel"}
                            </Button>
                        </li>
                    {/each}
                </ul>
            {:else}
                <p class="where">
                    {town.name}{town.id === here ? " — you are here." : ` — you are in ${here ? townName(here) : "transit"}.`}
                </p>
                {#each snap.goods as good (good.id)}
                    {@const g = town.goods[good.id]!}
                    <div class="good-row">
                        <span class="gname">{goodsName(good.id)}</span>
                        <span class="gbase">base {Math.round(g.basePrice)}</span>
                        <ExplainedNumber price={g.market} format={roundMoney} showLabel={false} />
                    </div>
                {/each}
                {#if here !== town.id}
                    <p class="travel-prompt">
                        <Button onclick={() => travelHere(town.id)} disabled={here === null}>
                            Travel to {town.name}
                        </Button>
                    </p>
                {/if}
            {/if}
        {/snippet}
    </PanelFrame>
{/if}

<style>
    .towns {
        list-style: none;
        margin: 6px 0 0;
        padding: 0;
        font-size: 13px;
    }

    .town-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 3px 0;
        border-bottom: 1px solid var(--line);
    }

    .town-link {
        color: var(--paper);
    }

    .town-link:hover {
        color: var(--gold);
    }

    .where {
        margin: 0 0 6px;
        font-size: 12px;
        color: var(--paper-dim);
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

    .gbase {
        color: var(--paper-dim);
        font-variant-numeric: tabular-nums;
    }

    .travel-prompt {
        margin: 10px 0 0;
    }
</style>
