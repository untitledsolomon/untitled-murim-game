<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import PanelFrame from "./PanelFrame.svelte";
</script>

{#if game.snapshot}
    {@const sects = game.snapshot.organizations.filter((o) => o.kind === "sect")}
    <PanelFrame
        title="Martial"
        numbers={[{ label: "Sects", value: `${sects.length}` }]}
        tabs={[{ id: "sects", label: "Sects" }]}
    >
        {#snippet content()}
            {#if sects.length === 0}
                <p class="muted">No sects known in this world.</p>
            {:else}
                {#each sects as sect (sect.id)}
                    <div class="sect">
                        <div class="shead">
                            <span class="sname">{sect.name}</span>
                            <span class="srep">reputation {Math.round(sect.reputation.value)}</span>
                        </div>
                        <div class="scaps">{sect.capabilities.join(", ") || "no capabilities listed"}</div>
                        {#each sect.members as m}
                            <div class="smember">
                                <span>{m.role}</span>
                                <span class="srole">loyalty {m.loyalty}</span>
                            </div>
                        {/each}
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

    .sect {
        padding: 6px 0;
        border-bottom: 1px solid var(--line);
    }

    .shead {
        display: flex;
        justify-content: space-between;
        gap: 12px;
    }

    .sname {
        font-weight: 500;
        color: var(--paper);
        font-size: 13px;
    }

    .srep {
        color: var(--gold);
        font-size: 12px;
    }

    .scaps {
        font-size: 11px;
        color: var(--paper-dim);
        margin: 2px 0 4px;
    }

    .smember {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 12px;
        color: var(--paper-dim);
        padding: 1px 0;
    }

    .srole {
        color: var(--paper-faint);
    }
</style>
