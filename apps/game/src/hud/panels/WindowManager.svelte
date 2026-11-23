<!-- Movable, closable window per open panel. The last-opened panel is on top. -->
<script lang="ts">
    import { game, bringToFront, closePanel } from "../lib/game-state.svelte";
    import { PANELS, type PanelDef } from "./registry";
    import NotYetAvailable from "./NotYetAvailable.svelte";

    const W = 400;
    const H = 320;
    const STEP = 28;

    interface Win {
        x: number;
        y: number;
        w: number;
        h: number;
    }

    /** One record per open panel, kept in sync with game.openPanels. */
    let wins = $state<Record<string, Win>>({});

    $effect(() => {
        const ids = new Set(game.openPanels);
        const next: Record<string, Win> = {};
        for (const id of game.openPanels) {
            if (wins[id]) next[id] = wins[id];
        }
        for (const id of ids) {
            if (!wins[id]) {
                const offset = game.openPanels.indexOf(id) * STEP;
                next[id] = { x: 60 + offset, y: 60 + offset, w: W, h: H };
            }
        }
        wins = next;
    });

    function defFor(id: string): PanelDef | undefined {
        return PANELS.find((p) => p.id === id);
    }

    function onHeaderDown(event: MouseEvent, win: Win): void {
        const startX = event.clientX - win.x;
        const startY = event.clientY - win.y;
        const move = (ev: MouseEvent) => {
            win.x = Math.max(0, ev.clientX - startX);
            win.y = Math.max(0, ev.clientY - startY);
        };
        const up = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
    }
</script>

{#each game.openPanels as id, i (id)}
    {@const win = wins[id]}
    {@const def = defFor(id)}
    {#if win && def}
        {@const topmost = i === game.openPanels.length - 1}
        <div
            class="window"
            class:topmost
            style="left: {win.x}px; top: {win.y}px; width: {win.w}px; height: {win.h}px"
            role="dialog"
            aria-label={def.title}
        >
            <div
                class="titlebar"
                role="button"
                tabindex="-1"
                aria-label={`Drag ${def.title}`}
                onmousedown={(e) => {
                    bringToFront(id);
                    onHeaderDown(e, win);
                }}
                onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") bringToFront(id);
                }}
            >
                <span class="win-title">{def.title}</span>
                <button class="close" title="Close" onclick={() => closePanel(id)}>✕</button>
            </div>
            <div class="content">
                {#if def.enabled}
                    {@const Cmp = def.component}
                    <Cmp />
                {:else}
                    <NotYetAvailable title={def.title} />
                {/if}
            </div>
        </div>
    {/if}
{/each}

<style>
    .window {
        position: absolute;
        display: flex;
        flex-direction: column;
        background: var(--ink);
        border: 1px solid var(--line);
        border-radius: var(--panel-radius);
        box-shadow: var(--shadow);
        overflow: hidden;
        z-index: var(--z-panels);
    }

    .window:not(.topmost) {
        filter: brightness(0.85);
    }

    .titlebar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 8px;
        background: var(--ink-2);
        border-bottom: 1px solid var(--line);
        cursor: grab;
        user-select: none;
    }

    .titlebar:active {
        cursor: grabbing;
    }

    .win-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--paper);
        letter-spacing: 0.03em;
    }

    .close {
        width: 20px;
        height: 20px;
        border-radius: 2px;
        color: var(--paper-dim);
        font-size: 11px;
        line-height: 1;
    }

    .close:hover {
        color: var(--danger);
        background: var(--ink-3);
    }

    .content {
        flex: 1;
        min-height: 0;
    }
</style>
