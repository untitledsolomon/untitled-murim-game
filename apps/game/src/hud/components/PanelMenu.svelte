<!-- Dropdown that opens any of the nine panels. Anchored by the top bar. -->
<script lang="ts">
    import { game, openPanel } from "../lib/game-state.svelte";
    import { PANELS } from "../panels/registry";

    let open = $state(false);

    function toggle(): void {
        open = !open;
    }

    function pick(id: string): void {
        openPanel(id);
        open = false;
    }
</script>

<div class="panel-menu">
    <button class="menu-button" class:active={open} onclick={toggle}>
        Panels {open ? "▲" : "▼"}
    </button>
    {#if open}
        <div class="menu" role="menu">
            {#each PANELS as p}
                <button role="menuitem" onclick={() => pick(p.id)}>
                    {p.title}
                    {#if game.openPanels.includes(p.id)}<span class="open-mark">•</span>{/if}
                </button>
            {/each}
        </div>
    {/if}
</div>

<style>
    .panel-menu {
        position: relative;
    }

    .menu-button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border: 1px solid var(--line);
        border-radius: var(--panel-radius);
        background: var(--ink-2);
        color: var(--paper-dim);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .menu-button:hover,
    .menu-button.active {
        color: var(--gold);
        border-color: var(--line-strong);
    }

    .menu {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        width: 200px;
        background: var(--ink);
        border: 1px solid var(--line-strong);
        border-radius: var(--panel-radius);
        box-shadow: var(--shadow);
        padding: 4px;
        display: flex;
        flex-direction: column;
        z-index: calc(var(--z-topbar) + 1);
    }

    .menu button {
        padding: 4px 8px;
        border-radius: 2px;
        color: var(--paper-dim);
        font-size: 13px;
        text-align: left;
        display: flex;
        justify-content: space-between;
    }

    .menu button:hover {
        color: var(--paper);
        background: var(--ink-2);
    }

    .open-mark {
        color: var(--gold);
    }
</style>
