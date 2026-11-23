<script lang="ts">
    import type { Price } from "@murim/sim";

    let {
        label,
        price,
        format = (n: number) => String(Math.round(n)),
        showLabel = true,
    }: {
        label?: string;
        price: Price;
        format?: (n: number) => string;
        showLabel?: boolean;
    } = $props();

    function factorsText(): string {
        return price.factors.map((f) => `${f.label}: ${f.amount > 0 ? "+" : ""}${format(f.amount)}`).join(", ");
    }
</script>

<button type="button" class="explained" aria-label={factorsText()}>
    {#if showLabel && label}<span class="elabel">{label}: </span>{/if}<strong>{format(price.value)}</strong>
    {#if price.factors.length > 0}
        <span class="tip" role="tooltip">
            {#each price.factors as f}
                <span class="row">
                    <span class="flabel">{f.label}</span>
                    <span class="famt">{f.amount > 0 ? "+" : ""}{format(f.amount)}</span>
                </span>
            {/each}
        </span>
    {/if}
</button>

<style>
    .explained {
        position: relative;
        display: inline-flex;
        align-items: baseline;
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        color: var(--paper);
        cursor: help;
    }

    .elabel {
        color: var(--paper-dim);
        font-weight: 400;
    }

    strong {
        font-variant-numeric: tabular-nums;
    }

    .tip {
        display: none;
        position: absolute;
        z-index: 40;
        left: 0;
        top: calc(100% + 6px);
        min-width: 200px;
        padding: 8px 10px;
        background: #16120d;
        border: 1px solid var(--line-strong);
        border-radius: var(--panel-radius);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
        text-align: left;
    }

    .explained:hover .tip,
    .explained:focus .tip {
        display: block;
    }

    .row {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        font-size: 12px;
        padding: 1px 0;
    }

    .flabel {
        color: var(--paper-dim);
    }

    .famt {
        color: var(--paper);
        font-variant-numeric: tabular-nums;
    }
</style>
