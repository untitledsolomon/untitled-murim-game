<script lang="ts">
    import type { MapMode } from "@murim/sim";
    import { game } from "../lib/game-state.svelte";
    import { DOCK_WIDTH, TOPBAR_HEIGHT } from "../lib/layout";

    const MODES: { id: MapMode; label: string }[] = [
        { id: "prices", label: "Prices" },
        { id: "crime", label: "Crime" },
        { id: "unrest", label: "Unrest" },
        { id: "influence", label: "Influence" },
        { id: "knowledge", label: "Knowledge" },
    ];

    function pickMode(mode: MapMode): void {
        game.setMapMode(mode);
    }

    function onGoodChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        game.selectedGoodId = value;
        game.uiPrefs.lastGood = value;
        game.persistUiPrefs();
    }

    /** A short caption per mode; the gradient and labels match map-sync.ts. */
    function legendFor(mode: MapMode): { id: string; low: string; high: string; palette: string } {
        switch (mode) {
            case "prices":
                return {
                    id: "prices",
                    low: "0.7× base",
                    high: "1.6× base",
                    palette: "linear-gradient(90deg, #3a6ea5, #8d9a70 50%, #c2452b)",
                };
            case "crime":
                return { id: "crime", low: "low", high: "high", palette: "linear-gradient(90deg, #6f8964, #d9a441 50%, #c23b2e)" };
            case "unrest":
                return { id: "unrest", low: "low", high: "high", palette: "linear-gradient(90deg, #6f8964, #d9a441 50%, #c23b2e)" };
            case "influence":
                return { id: "influence", low: "low", high: "high", palette: "linear-gradient(90deg, #6f8964, #d9a441 50%, #c23b2e)" };
            case "knowledge":
                return { id: "knowledge", low: "", high: "", palette: "" };
        }
    }

    const legend = $derived(legendFor(game.mode));
</script>

<div class="map-chrome" style="top: {TOPBAR_HEIGHT}px; right: {DOCK_WIDTH}px;">
    <div class="inner">
        <div class="modes" role="tablist" aria-label="Map mode">
            {#each MODES as m (m.id)}
                <button
                    type="button"
                    role="tab"
                    aria-selected={game.mode === m.id}
                    class:active={game.mode === m.id}
                    onclick={() => pickMode(m.id)}
                >
                    {m.label}
                </button>
            {/each}
        </div>

        {#if game.mode === "prices" && game.snapshot}
            <label class="good-pick">
                <span class="glabel">Price of:</span>
                <select value={game.selectedGoodId} onchange={onGoodChange} aria-label="Good shown at prices">
                    {#each game.snapshot.goods as good (good.id)}
                        <option value={good.id}>{good.name}</option>
                    {/each}
                </select>
            </label>
        {/if}

        {#if legend.palette}
            <div class="legend" aria-label="Legend for {MODES.find((m) => m.id === legend.id)?.label}">
                <div class="swatch" style="background: {legend.palette};"></div>
                <span class="lg low">{legend.low}</span>
                <span class="lg high">{legend.high}</span>
            </div>
        {:else if legend.id === "knowledge"}
            <div class="legend">
                <span class="dot known"></span><span class="lg">known</span>
                <span class="dot unknown"></span><span class="lg">unknown</span>
                <span class="note">every town is known to you until fog lands in a later phase</span>
            </div>
        {/if}
    </div>
</div>

<style>
    .map-chrome {
        position: absolute;
        left: 0;
        display: flex;
        justify-content: center;
        margin-top: 6px;
        pointer-events: none;
        z-index: var(--z-chrome);
    }

    .inner {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 100%;
        padding: 4px 8px;
        background: var(--ink);
        border: 1px solid var(--line);
        border-radius: var(--panel-radius);
        box-shadow: var(--shadow);
    }

    .modes {
        display: flex;
        gap: 2px;
    }

    .modes button {
        min-height: 30px;
        padding: 4px 10px;
        border-radius: 2px;
        color: var(--paper-dim);
        background: none;
        border: none;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .modes button:hover {
        color: var(--paper);
    }

    .modes button.active {
        background: var(--ink-3);
        color: var(--gold);
    }

    .good-pick {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .glabel {
        font-size: 12px;
        color: var(--paper-dim);
    }

    .good-pick select {
        min-height: 28px;
        font-size: 12px;
    }

    .legend {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .swatch {
        width: 72px;
        height: 8px;
        border-radius: 2px;
        border: 1px solid var(--ink-3);
    }

    .lg {
        font-size: 11px;
        color: var(--paper-dim);
    }

    .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
    }

    .dot.known {
        background: #9ab35a;
    }

    .dot.unknown {
        background: #55555c;
    }

    .note {
        font-size: 11px;
        color: var(--paper-faint);
    }
</style>
