<script lang="ts">
    /** Accessible table wrapper. Panels put <tbody><tr> rows in the children slot. */
    let { children }: { children?: import("svelte").Snippet } = $props();
</script>

<table class="shared-table">
    {@render children?.()}
</table>

<style>
    .shared-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
    }

    .shared-table :global(th),
    .shared-table :global(td) {
        padding: 5px 6px;
        text-align: left;
        border-bottom: 1px solid var(--line);
        vertical-align: top;
    }

    .shared-table :global(th) {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--paper-faint);
        font-weight: 400;
    }
</style>
