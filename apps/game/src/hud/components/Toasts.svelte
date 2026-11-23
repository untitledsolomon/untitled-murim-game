<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { NAV_HEIGHT } from "../lib/layout";
    import Toast from "./ui/Toast.svelte";
</script>

{#if game.toasts.length > 0}
    <div class="toasts" style="bottom: calc({NAV_HEIGHT}px + 12px);">
        {#each game.toasts as t (t.id)}
            <Toast severity={t.severity} text={t.text} onDismiss={() => game.dismissToast(t.id)} />
        {/each}
    </div>
{/if}

<style>
    .toasts {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        z-index: var(--z-toast);
        pointer-events: auto;
    }
</style>
