<script lang="ts">
    import { game } from "../lib/game-state.svelte";
    import { load, newGame, save, setPaused } from "../hud-bridge";

    const STORAGE_KEY = "murim-save";

    let message: string | null = null;
    let flash: number | undefined;
    let confirmingNew = false;

    function status(text: string): void {
        message = text;
        window.clearTimeout(flash);
        flash = window.setTimeout(() => (message = null), 2200);
    }

    function doSave(): void {
        const text = save();
        if (text === null) {
            status("Nothing to save yet");
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEY, text);
            status("Save written");
        } catch {
            status("Save failed");
        }
    }

    function doLoad(): void {
        const text = localStorage.getItem(STORAGE_KEY);
        if (text === null) {
            status("No save found");
            return;
        }
        status(load(text) ? "Save loaded" : "Save invalid");
    }

    function doNewGame(): void {
        const seed = Number((document.getElementById("new-seed") as HTMLInputElement | null)?.value ?? NaN);
        newGame(Number.isFinite(seed) ? seed : game.snapshot?.seed ?? 1337);
        setPaused(true);
        confirmingNew = false;
        status("New world started");
    }
</script>

<div class="saveload">
    <button onclick={doSave} title="Write the current world to local storage">Save</button>
    <button onclick={doLoad} title="Restore the saved world">Load</button>
    <button onclick={() => (confirmingNew = !confirmingNew)} title="Start a fresh world">New</button>
    {#if confirmingNew}
        <span class="new-row">
            <input
                id="new-seed"
                type="number"
                value={game.snapshot?.seed ?? "1337"}
                aria-label="World seed"
            />
            <button class="confirm" onclick={doNewGame}>Start</button>
            <button onclick={() => (confirmingNew = false)}>Cancel</button>
        </span>
    {/if}
    {#if message}
        <span class="status">{message}</span>
    {/if}
</div>

<style>
    .saveload {
        position: absolute;
        bottom: 14px;
        right: 12px;
        display: flex;
        gap: 6px;
        align-items: center;
        background: var(--ink);
        border: 1px solid var(--line);
        border-radius: var(--panel-radius);
        padding: 4px;
        box-shadow: var(--shadow);
        z-index: var(--z-topbar);
    }

    button {
        padding: 3px 10px;
        border-radius: 2px;
        color: var(--paper-dim);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    button:hover {
        color: var(--paper);
        background: var(--ink-2);
    }

    .new-row {
        display: flex;
        gap: 4px;
        align-items: center;
    }

    .confirm {
        color: var(--gold);
    }

    input {
        width: 72px;
        padding: 3px 6px;
    }

    .status {
        font-size: 11px;
        color: var(--paper-dim);
        max-width: 160px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
