<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        kind = "ghost",
        disabled = false,
        title,
        children,
        onclick,
    }: {
        kind?: "primary" | "ghost" | "danger";
        disabled?: boolean;
        title?: string;
        children?: Snippet;
        onclick?: (event: MouseEvent) => void;
    } = $props();
</script>

<button
    class:primary={kind === "primary"}
    class:ghost={kind === "ghost"}
    class:danger={kind === "danger"}
    {disabled}
    {title}
    {onclick}
>
    {@render children?.()}
</button>

<style>
    button {
        min-height: 32px;
        padding: 5px 12px;
        border-radius: var(--panel-radius);
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        border: 1px solid var(--line);
        background: var(--ink-2);
        color: var(--paper-dim);
    }

    button:hover:not(:disabled) {
        color: var(--paper);
        border-color: var(--line-strong);
    }

    button:disabled {
        opacity: 0.5;
        cursor: default;
    }

    .primary {
        background: var(--gold-dim);
        border-color: var(--gold-dim);
        color: #1c1812;
        font-weight: 600;
    }

    .primary:hover:not(:disabled) {
        background: var(--gold);
        border-color: var(--gold);
        color: #14100a;
    }

    .danger {
        color: var(--danger);
    }

    .danger:hover:not(:disabled) {
        color: #ff8a7a;
        border-color: var(--danger);
    }
</style>
