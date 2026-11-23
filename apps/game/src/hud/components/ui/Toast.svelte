<script lang="ts">
    import type { ToastSeverity } from "../../lib/game-state.svelte";
    import { TOAST_MS } from "../../lib/layout";

    let { severity = "info", text, duration = TOAST_MS, onDismiss }: { severity?: ToastSeverity; text: string; duration?: number; onDismiss?: () => void } = $props();

    // Auto-dismiss after the toast duration. Cleanup cancels the timer if the
    // toast leaves the list early (manual dismiss or a full cap of three).
    $effect(() => {
        if (duration <= 0) return;
        const timer = setTimeout(() => onDismiss?.(), duration);
        return () => clearTimeout(timer);
    });
</script>

<div
    class="toast"
    class:info={severity === "info"}
    class:warning={severity === "warning"}
    class:danger={severity === "danger"}
    role="status"
>
    <span class="ttext">{text}</span>
    <button class="tdismiss" type="button" aria-label="Dismiss" onclick={() => onDismiss?.()}>×</button>
</div>

<style>
    .toast {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        max-width: 360px;
        padding: 10px 12px;
        background: var(--ink-2);
        border: 1px solid var(--line-strong);
        border-left: 3px solid var(--info);
        border-radius: var(--panel-radius);
        color: var(--paper-dim);
        font-size: 13px;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
    }

    .warning {
        border-left-color: var(--gold);
    }

    .danger {
        border-left-color: var(--danger);
    }

    .ttext {
        flex: 1;
    }

    .tdismiss {
        background: none;
        border: none;
        color: var(--paper-faint);
        font-size: 16px;
        line-height: 1;
        padding: 0 2px;
        cursor: pointer;
        min-width: 20px;
        min-height: 20px;
    }

    .tdismiss:hover {
        color: var(--paper);
    }
</style>
