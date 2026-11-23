<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { formatMoney } from "../lib/format";
    import PanelFrame from "./PanelFrame.svelte";

    const kindLabel: Record<string, string> = {
        sect: "Sect",
        merchant_house: "Merchant house",
        bank: "Bank",
        escort: "Escort",
        government: "Government",
    };

    let selectedOrg = $state<string | null>(null);

    function orgById(id: string) {
        return game.snapshot?.organizations.find((o) => o.id === id);
    }

    function goodsLabel(goodId: string): string {
        return game.snapshot?.goods.find((g) => g.id === goodId)?.name ?? goodId;
    }
</script>

{#if game.snapshot}
    {@const snap = game.snapshot}
    {@const playerOrgs = snap.organizations.filter((o) =>
        o.members.some((m) => m.personId === snap.player.personId),
    )}
    <PanelFrame title="Organization" tabs={[{ id: "all", label: "All groups" }]}>
        {#snippet content()}
            {#if playerOrgs.length > 0}
                <p class="mine">You belong to:</p>
                {#each playerOrgs as org}
                    <div class="org-row mine-row">
                        <span class="oname">{org.name}</span>
                        <span class="okind">{kindLabel[org.kind] ?? org.kind}</span>
                        <span class="orep">{Math.round(org.reputation.value)}</span>
                    </div>
                {/each}
            {/if}
            {#each snap.organizations as org (org.id)}
                <button
                    class="org-row"
                    onclick={() => (selectedOrg = org.id === selectedOrg ? null : org.id)}
                    class:open={selectedOrg === org.id}
                >
                    <span class="oname">{org.name}</span>
                    <span class="okind">{kindLabel[org.kind] ?? org.kind}</span>
                    <span class="orep">{Math.round(org.reputation.value)}</span>
                </button>
                {#if selectedOrg === org.id}
                    {@const detail = orgById(org.id)!}
                    <div class="detail">
                        <dl class="kv">
                            <dt>Founded</dt>
                            <dd>Day {detail.foundedDay}</dd>
                            <dt>Members</dt>
                            <dd>{detail.members.map((m) => m.personId).length}</dd>
                        </dl>
                        {#if detail.members.length > 0}
                            <p class="sub">Members</p>
                            <table>
                                <tbody>
                                    {#each detail.members as m}
                                        <tr>
                                            <td>{m.role}</td>
                                            <td class="muted">{m.loyalty}</td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        {/if}
                        {#if detail.holdings.length > 0}
                            <p class="sub">Holdings</p>
                            <table>
                                <tbody>
                                    {#each detail.holdings as h}
                                        <tr>
                                            <td>{goodsLabel(h.good)}</td>
                                            <td>{h.quantity}</td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        {/if}
                        {#if detail.capabilities.length > 0}
                            <p class="sub">Capabilities</p>
                            <p class="caps">{detail.capabilities.join(", ")}</p>
                        {/if}
                    </div>
                {/if}
            {/each}
        {/snippet}
    </PanelFrame>
{/if}

<style>
    .mine {
        color: var(--gold-dim);
        font-size: 12px;
        margin: 0 0 6px;
    }

    .org-row {
        display: flex;
        align-items: baseline;
        gap: 10px;
        width: 100%;
        padding: 4px 6px;
        border-radius: 2px;
        text-align: left;
    }

    .org-row:hover,
    .org-row.open {
        background: var(--ink-2);
    }

    .oname {
        font-weight: 500;
        color: var(--paper);
        flex: 1;
    }

    .okind {
        color: var(--paper-faint);
        font-size: 11px;
    }

    .orep {
        color: var(--gold);
        font-variant-numeric: tabular-nums;
    }

    .detail {
        padding: 4px 6px 10px;
    }

    .kv {
        display: grid;
        grid-template-columns: 90px 1fr;
        gap: 2px 10px;
        margin: 4px 0 8px;
    }

    dt {
        color: var(--paper-faint);
        font-size: 12px;
    }

    dd {
        margin: 0;
        font-size: 12px;
    }

    .sub {
        color: var(--paper-faint);
        text-transform: uppercase;
        font-size: 10px;
        letter-spacing: 0.05em;
        margin: 10px 0 3px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
    }

    td {
        padding: 2px 4px;
        border-bottom: 1px solid var(--line-strong);
    }

    .muted {
        color: var(--paper-faint);
    }

    .caps {
        font-size: 12px;
        color: var(--paper-dim);
        margin: 0;
    }
</style>
