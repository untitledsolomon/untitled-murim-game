<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { DOCK_WIDTH, TOPBAR_HEIGHT } from "../lib/layout";
</script>

{#if game.onboarding && game.onboarding.step < 3}
    <div class="onboarding" style="top: calc({TOPBAR_HEIGHT}px + 52px); right: {DOCK_WIDTH}px;">
        <span class="badge">Next step</span>
        <span class="text">{game.onboarding.text}</span>
        <button
            class="dismiss"
            type="button"
            aria-label="Dismiss the next-step strip"
            onclick={() => game.dismissOnboarding()}
        >
            ✕
        </button>
    </div>
{/if}

<style>
    .onboarding {
        position: absolute;
        left: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 0 auto;
        padding: 5px 10px;
        background: var(--ink);
        border: 1px solid var(--gold-dim);
        border-radius: var(--panel-radius);
        box-shadow: var(--shadow);
        z-index: var(--z-chrome);
        pointer-events: auto;
        max-width: 560px;
    }

    .badge {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--gold);
        white-space: nowrap;
    }

    .text {
        font-size: 13px;
        color: var(--paper-dim);
    }

    .dismiss {
        min-width: 28px;
        min-height: 28px;
        color: var(--paper-faint);
        background: none;
        border: none;
        font-size: 14px;
    }

    .dismiss:hover {
        color: var(--paper);
    }
</style>
