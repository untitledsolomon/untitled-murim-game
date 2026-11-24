<script lang="ts">
    let { tone = "default", children }: { tone?: "default" | "gold" | "ok" | "info" | "danger" | "muted"; children?: import("svelte").Snippet } = $props();
</script>

<span
    class="chip"
    class:gold={tone === "gold"}
    class:ok={tone === "ok"}
    class:info={tone === "info"}
    class:danger={tone === "danger"}
    class:muted={tone === "muted"}
>
    {@render children?.()}
</span>

<style>
    .chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--ink-2);
        border: 1px solid var(--line);
        color: var(--paper-dim);
        font-size: 12px;
        white-space: nowrap;
    }

    .gold {
        color: var(--gold);
        border-color: var(--gold-dim);
    }

    .ok {
        color: var(--ok);
    }

    .info {
        color: var(--info);
    }

    .danger {
        color: var(--danger);
        border-color: var(--danger);
    }

    .muted {
        color: var(--paper-faint);
    }
</style>
