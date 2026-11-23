<script lang="ts">
    import { game, SPEEDS } from "../lib/game-state.svelte";
    import { setPaused, setSpeed } from "../hud-bridge";
</script>

<div class="time-controls" aria-label="Simulation speed">
    <button
        class="pause"
        class:active={!game.paused}
        onclick={() => setPaused(!game.paused)}
        title={game.paused ? "Resume (space)" : "Pause (space)"}
    >
        {game.paused ? "▶" : "❚❚"}
    </button>
    {#each SPEEDS as s, i}
        <button class="speed" class:active={!game.paused && game.speedIndex === i} onclick={() => setSpeed(i)}>
            {s}×
        </button>
    {/each}
</div>

<style>
    .time-controls {
        position: absolute;
        bottom: 14px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 2px;
        background: var(--ink);
        border: 1px solid var(--line);
        border-radius: var(--panel-radius);
        padding: 2px;
        z-index: var(--z-topbar);
        box-shadow: var(--shadow);
    }

    button {
        min-width: 40px;
        padding: 4px 10px;
        border-radius: 2px;
        color: var(--paper-dim);
        font-size: 12px;
        font-variant-numeric: tabular-nums;
    }

    button:hover {
        color: var(--paper);
    }

    button.active {
        background: var(--ink-3);
        color: var(--gold);
    }

    .pause {
        min-width: 34px;
    }
</style>
