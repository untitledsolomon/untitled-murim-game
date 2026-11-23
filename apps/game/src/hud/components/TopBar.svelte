<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { formatDay } from "../lib/format";

    let hovered = $state<string | null>(null);

    function fmt(n: number): string {
        return Math.round(n).toLocaleString("en-US");
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
</script>

<header class="topbar">
    <div class="brand">
        <span class="title">Murim Merchant</span>
        <span class="day">{game.snapshot ? formatDay(game.snapshot.day) : "—"}</span>
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

    <div class="hint">drag to pan · wheel to zoom · space to pause</div>
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
        gap: 24px;
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

    .hint {
        font-size: 11px;
        color: var(--paper-faint);
        white-space: nowrap;
    }
</style>
