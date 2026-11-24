<script lang="ts">
    let { title, children }: { title?: string; children?: import("svelte").Snippet } = $props();
</script>

<section class="section">
    {#if title}<h3 class="stitle">{title}</h3>{/if}
    {@render children?.()}
</section>

<style>
    .section {
        margin: 0 0 14px;
    }

    .stitle {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--paper-faint);
        margin: 0 0 6px;
    }
</style>
