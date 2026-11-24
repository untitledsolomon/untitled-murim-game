<script lang="ts">
    import { game, SPEEDS } from "../lib/game-state.svelte";
    import { formatDay, formatMoney } from "../lib/format";
    import { load, newGame, save } from "../lib/persistence";

    let hovered = $state<string | null>(null);
    const SAVE_KEY = "murim-save";

    function fmt(n: number): string {
        return Math.round(n).toLocaleString("en-US");
    }

    function townName(id: string): string {
        return game.snapshot?.towns.find((t) => t.id === id)?.name ?? id;
    }

    const measures = $derived(
        game.snapshot
            ? [
                  { key: "wealth", label: "Wealth", value: game.snapshot.measures.wealth, tone: "gold" },
                  { key: "influence", label: "Influence", value: game.snapshot.measures.influence, tone: "info" },
                  { key: "power", label: "Power", value: game.snapshot.measures.power, tone: "danger" },
              ]
            : [],
    );

    const locationText = $derived.by(() => {
        const snap = game.snapshot;
        if (!snap) return "—";
        const here = snap.player.location;
        if (here === null) return "Between towns";
        return townName(here);
    });

    const speedLabel = $derived(`${SPEEDS[game.speedIndex] ?? 1}×`);

    function cycleSpeed(): void {
        game.setSpeed((game.speedIndex + 1) % SPEEDS.length);
    }

    function togglePause(): void {
        game.setPaused(!game.paused);
    }

    function saveWorld(): void {
        const text = save();
        if (text === null) {
            game.pushToast({ id: ++game.toastSeq, severity: "warning", text: "Nothing to save yet.", day: game.snapshot?.day ?? 0 });
            return;
        }
        try {
            localStorage.setItem(SAVE_KEY, text);
            game.pushToast({ id: ++game.toastSeq, severity: "info", text: "World saved.", day: game.snapshot?.day ?? 0 });
        } catch {
            game.pushToast({ id: ++game.toastSeq, severity: "danger", text: "Could not write the save (storage full or blocked).", day: game.snapshot?.day ?? 0 });
        }
    }

    function loadWorld(): void {
        const text = localStorage.getItem(SAVE_KEY);
        if (!text) {
            game.pushToast({ id: ++game.toastSeq, severity: "warning", text: "No saved world on this machine.", day: game.snapshot?.day ?? 0 });
            return;
        }
        if (load(text)) {
            game.resetForNewWorld();
            game.pushToast({ id: ++game.toastSeq, severity: "info", text: "Saved world loaded.", day: game.snapshot?.day ?? 0 });
        } else {
            game.pushToast({ id: ++game.toastSeq, severity: "danger", text: "The save is unreadable.", day: game.snapshot?.day ?? 0 });
        }
    }

    function startNew(): void {
        const input = window.prompt("Seed for a new world:", String(game.snapshot?.seed ?? 1337));
        if (input === null) return;
        const seed = Number(input);
        if (!Number.isFinite(seed)) return;
        newGame(seed);
        game.resetForNewWorld();
        game.pushToast({ id: ++game.toastSeq, severity: "info", text: `New world ${seed}.`, day: 0 });
    }
</script>

<header class="topbar">
    <div class="brand">
        <span class="title">Murim Merchant</span>
        <span class="day">{game.snapshot ? formatDay(game.snapshot.day) : "—"}</span>
    </div>

    <div class="controls">
        <button class="ctrl" type="button" title={game.paused ? "Run time" : "Pause time"} onclick={togglePause}>
            {game.paused ? "▶" : "⏸"}
        </button>
        <button class="ctrl speed" type="button" title="Cycle time speed" onclick={cycleSpeed}>
            {speedLabel}
        </button>
    </div>

    <div class="measures">
        {#if measures.length}
            {#each measures as m}
                <span class="measure-wrap">
                    <button
                        class="measure {m.tone}"
                        class:active={hovered === m.key}
                        onmouseenter={() => (hovered = m.key)}
                        onmouseleave={() => (hovered = null)}
                        onfocus={() => (hovered = m.key)}
                        onblur={() => (hovered = null)}
                    >
                        <span class="mlabel">{m.label}</span>
                        <span class="mvalue">{fmt(m.value.value)}</span>
                    </button>
                    {#if hovered === m.key && m.value.factors.length > 0}
                        <div class="tooltip">
                            {#each m.value.factors as f}
                                <div class="factor">
                                    <span class="flabel">{f.label}</span>
                                    <span class="fvalue">{f.amount > 0 ? "+" : ""}{fmt(f.amount)}</span>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </span>
            {/each}
        {/if}
    </div>

    <div class="status">
        <span class="loc-label">Where</span>
        <span class="loc-value">{locationText}</span>
    </div>

    {#if game.revealAll}
        <span class="debug-badge" title="The debug 'reveal all' toggle is on">DEBUG: fog off</span>
    {/if}

    <div class="save-row">
        <button class="ctrl" type="button" title="Save the world" onclick={saveWorld}>Save</button>
        <button class="ctrl" type="button" title="Load the saved world" onclick={loadWorld}>Load</button>
        <button class="ctrl" type="button" title="Start a new world" onclick={startNew}>New</button>
    </div>
</header>

<style>
    .topbar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 48px;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 0 14px;
        background: var(--ink);
        border-bottom: 1px solid var(--line);
        z-index: var(--z-topbar);
    }

    .brand {
        display: flex;
        flex-direction: column;
        line-height: 1.1;
    }

    .title {
        font-weight: 600;
        letter-spacing: 0.04em;
        color: var(--gold);
    }

    .day {
        font-size: 12px;
        color: var(--paper-dim);
    }

    .controls {
        display: flex;
        gap: 6px;
    }

    .ctrl {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        min-height: 32px;
        padding: 0 10px;
        border: 1px solid var(--line);
        border-radius: var(--panel-radius);
        background: var(--ink-2);
        color: var(--paper-dim);
        font-size: 13px;
    }

    .ctrl:hover {
        color: var(--gold);
        border-color: var(--line-strong);
    }

    .ctrl.speed {
        min-width: 44px;
        font-variant-numeric: tabular-nums;
    }

    .measures {
        display: flex;
        gap: 8px;
        flex: 1;
        justify-content: center;
    }

    .measure-wrap {
        position: relative;
    }

    .measure {
        display: flex;
        align-items: baseline;
        gap: 8px;
        padding: 4px 12px;
        background: var(--ink-2);
        border: 1px solid var(--line);
        border-radius: var(--panel-radius);
        min-width: 108px;
    }

    .measure.active {
        border-color: var(--line-strong);
    }

    .measure.gold .mvalue {
        color: var(--gold);
    }

    .measure.info .mvalue {
        color: var(--info);
    }

    .measure.danger .mvalue {
        color: var(--danger);
    }

    .mlabel {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--paper-dim);
    }

    .mvalue {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }

    .tooltip {
        position: absolute;
        top: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
        min-width: 160px;
        background: var(--ink-3);
        border: 1px solid var(--line-strong);
        border-radius: var(--panel-radius);
        box-shadow: var(--shadow);
        padding: 6px 8px;
        z-index: calc(var(--z-topbar) + 1);
    }

    .factor {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 12px;
        padding: 1px 0;
    }

    .flabel {
        color: var(--paper-dim);
    }

    .fvalue {
        color: var(--paper);
        font-variant-numeric: tabular-nums;
    }

    .status {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
        padding: 0 10px;
        border-left: 1px solid var(--line);
    }

    .loc-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--paper-faint);
    }

    .loc-value {
        color: var(--paper);
        font-size: 13px;
    }

    .debug-badge {
        padding: 2px 8px;
        border: 1px solid var(--danger);
        border-radius: 999px;
        color: var(--danger);
        font-size: 11px;
        white-space: nowrap;
        margin-left: 6px;
    }

    .save-row {
        display: flex;
        gap: 6px;
        margin-left: 2px;
    }
</style>
