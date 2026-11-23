<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { formatMoney } from "../lib/format";
    import PanelFrame from "./PanelFrame.svelte";

    const tabs = [
        { id: "self", label: "Self" },
        { id: "family", label: "Family" },
    ];

    function townName(id: string | null): string {
        if (!id) return "away";
        return game.snapshot?.towns.find((t) => t.id === id)?.name ?? id;
    }
</script>

{#if game.snapshot}
    {@const p = game.snapshot.player}
    <PanelFrame title="You and family" tabs={tabs}>
        {#snippet content(selected: string)}
            {#if selected === "self"}
                <dl class="kv">
                    <dt>Name</dt>
                    <dd>{p.name}</dd>
                    <dt>Age</dt>
                    <dd>{p.age}</dd>
                    <dt>Background</dt>
                    <dd>{p.background}</dd>
                    <dt>Cash</dt>
                    <dd class="gold">{formatMoney(p.cash)}</dd>
                </dl>
                {#if p.location}
                    <p class="muted">Present in {townName(p.location)}.</p>
                {/if}
            {:else}
                {#if p.family.length === 0}
                    <p class="muted">No family yet.</p>
                {:else}
                    <table>
                        <tbody>
                            {#each p.family as m (m.id)}
                                <tr>
                                    <td class="strong">{m.name}</td>
                                    <td>{m.age}</td>
                                    <td class="muted">{townName(m.location)}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            {/if}
        {/snippet}
    </PanelFrame>
{/if}


<style>
    .kv {
        display: grid;
        grid-template-columns: 110px 1fr;
        gap: 4px 12px;
        margin: 0 0 10px;
    }

    dt {
        color: var(--paper-faint);
    }

    dd {
        margin: 0;
        color: var(--paper);
    }

    .muted {
        color: var(--paper-dim);
    }

    .gold {
        color: var(--gold);
        font-weight: 600;
    }

    .strong {
        color: var(--paper);
        font-weight: 500;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
    }

    td {
        padding: 3px 0;
        border-bottom: 1px solid var(--line);
    }
</style>
