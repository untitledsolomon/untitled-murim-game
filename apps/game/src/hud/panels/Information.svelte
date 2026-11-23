<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { formatDay } from "../lib/format";
    import PanelFrame from "./PanelFrame.svelte";

    const tabs = [
        { id: "alerts", label: "Alerts" },
        { id: "outliner", label: "Watch list" },
    ];
</script>

{#if game.snapshot}
    {@const snap = game.snapshot}
    <PanelFrame title="Information" {tabs} numbers={[{ label: "Alerts", value: `${snap.alerts.length}` }]}>
        {#snippet content(selected: string)}
            {#if selected === "outliner"}
                {#if snap.outliner.length === 0}
                    <p class="muted">Nothing demands attention.</p>
                {:else}
                    {#each [...snap.outliner].sort((a, b) => b.priority - a.priority) as item (item.id)}
                        <div class="row"><span class="label">{item.label}</span></div>
                    {/each}
                {/if}
            {:else}
                {#if snap.alerts.length === 0}
                    <p class="muted">No reports yet.</p>
                {:else}
                    {#each [...snap.alerts].sort((a, b) => b.day - a.day) as a (a.id)}
                        <div class="alert {a.severity}">
                            <span class="aday">{formatDay(a.day)}</span>
                            <span class="atext">{a.text}</span>
                        </div>
                    {/each}
                {/if}
            {/if}
        {/snippet}
    </PanelFrame>
{/if}

<style>
    .muted {
        color: var(--paper-dim);
    }

    .alert {
        display: flex;
        gap: 8px;
        padding: 4px 0;
        border-bottom: 1px solid var(--line);
        font-size: 12px;
    }

    .alert.danger {
        border-left-color: var(--danger);
    }

    .alert.warning {
        border-left-color: var(--warn);
    }

    .alert.info {
        border-left-color: var(--info);
    }

    .alert.danger,
    .alert.warning,
    .alert.info {
        padding-left: 6px;
        border-left-width: 3px;
        border-left-style: solid;
    }

    .aday {
        color: var(--paper-faint);
        white-space: nowrap;
    }

    .atext {
        color: var(--paper-dim);
    }

    .row {
        padding: 4px 0;
        border-bottom: 1px solid var(--line);
        font-size: 12px;
    }

    .label {
        color: var(--paper-dim);
    }
</style>
