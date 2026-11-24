<script lang="ts">
    let { title }: { title: string } = $props();
</script>

<div class="stub">
    <p class="heading">Not yet available</p>
    <p class="body">
        {title} is not part of the v0.1 trader's loop. It arrives in a later
        release. Nothing is hidden by this stub — the sim simply does not model
        {title.toLowerCase()} yet.
    </p>
</div>

<style>
    .stub {
        padding: 16px 12px;
        text-align: center;
        color: var(--paper-dim);
    }

    .heading {
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--paper);
        margin: 0 0 6px;
    }

    .body {
        font-size: 12px;
        line-height: 1.5;
        max-width: 30em;
        margin: 0 auto;
    }
</style>
