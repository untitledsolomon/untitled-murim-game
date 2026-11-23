<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import PanelFrame from "./PanelFrame.svelte";
</script>

{#if game.snapshot}
    {@const snap = game.snapshot}
    {@const power = snap.measures.power}
    <PanelFrame
        title="Politics"
        numbers={[{ label: "Power", value: `${Math.round(power.value)}`, tone: "danger" }]}
        tabs={[{ id: "counties", label: "Counties" }]}
    >
        {#snippet content()}
            <p class="muted">Held office</p>
            {#each power.factors as f (f.label)}
                <div class="factor">
                    <span class="flabel">{f.label}</span>
                    <span class="fvalue">{f.amount > 0 ? "+" : ""}{Math.round(f.amount)}</span>
                </div>
            {/each}
            <p class="muted">Counties</p>
            {#each snap.counties as c (c.id)}
                <div class="county">
                    <span class="cname">
                        {c.name}
                        {#if c.isCapital}<span class="capital">capital</span>{/if}
                    </span>
                    <span class="cmag">
                        {snap.towns.filter((t) => t.countyId === c.id).length} towns
                    </span>
                </div>
            {/each}
        {/snippet}
    </PanelFrame>
{/if}

<style>
    .muted {
        color: var(--paper-faint);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 6px 0 4px;
    }

    .factor {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 12px;
        padding: 2px 0;
    }

    .flabel {
        color: var(--paper-dim);
    }

    .fvalue {
        color: var(--paper);
        font-variant-numeric: tabular-nums;
    }

    .county {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 5px 0;
        border-top: 1px solid var(--line);
        font-size: 12px;
    }

    .cname {
        color: var(--paper);
    }

    .capital {
        color: var(--gold);
        font-size: 10px;
        text-transform: uppercase;
    }

    .cmag {
        color: var(--paper-faint);
    }
</style>
