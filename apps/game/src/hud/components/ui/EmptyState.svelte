<script lang="ts">
    let { children }: { children?: import("svelte").Snippet } = $props();
</script>

<div class="empty">
    <p>{@render children?.()}</p>
</div>

<style>
    .empty {
        padding: 18px 12px;
        text-align: center;
        color: var(--paper-faint);
        font-size: 13px;
    }

    .empty :global(p) {
        margin: 0;
    }
</style>
