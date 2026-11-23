<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import PanelFrame from "./PanelFrame.svelte";
</script>

{#if game.snapshot}
    <PanelFrame
        title="Succession"
        numbers={[{ label: "Contest", value: "none", tone: "ok" }]}
        tabs={[{ id: "contest", label: "Contest" }]}
    >
        {#snippet content()}
            <p class="none">No pending succession contest.</p>
            <p class="hint">
                A contest appears here when a head dies without having designated an heir.
                Until then, succession follows the organization's own custom.
            </p>
        {/snippet}
    </PanelFrame>
{/if}

<style>
    .none {
        color: var(--paper);
        font-weight: 500;
    }

    .hint {
        color: var(--paper-faint);
        font-size: 12px;
        max-width: 30em;
    }
</style>
