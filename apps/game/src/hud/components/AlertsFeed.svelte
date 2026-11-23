<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { formatDay } from "../lib/format";
</script>

{#if game.snapshot && game.snapshot.alerts.length > 0}
    <div class="alerts" aria-label="Alerts">
        {#each game.snapshot.alerts.slice(-6).reverse() as a (a.id)}
            <div class="alert {a.severity}">
                <span class="day">{formatDay(a.day)}</span>
                <span class="text">{a.text}</span>
            </div>
        {/each}
    </div>
{/if}

<style>
    .alerts {
        position: absolute;
        top: 60px;
        right: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 320px;
        z-index: var(--z-alerts);
    }

    .alert {
        display: flex;
        gap: 8px;
        align-items: baseline;
        background: var(--ink-2);
        border: 1px solid var(--line);
        border-left-width: 3px;
        border-radius: var(--panel-radius);
        padding: 6px 10px;
        box-shadow: var(--shadow);
        font-size: 12px;
    }

    .alert.info {
        border-left-color: var(--info);
    }

    .alert.warning {
        border-left-color: var(--warn);
    }

    .alert.danger {
        border-left-color: var(--danger);
    }

    .day {
        color: var(--paper-faint);
        white-space: nowrap;
    }
</style>
