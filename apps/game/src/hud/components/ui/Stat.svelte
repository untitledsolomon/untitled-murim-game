<script lang="ts">
    export type StatTone = "default" | "gold" | "info" | "danger" | "ok";

    let { label, value, tone = "default", hint }: { label: string; value: string; tone?: StatTone; hint?: string } = $props();
</script>

<div class="stat {tone}" title={hint}>
    <span class="slabel">{label}</span>
    <span class="svalue">{value}</span>
</div>

<style>
    .stat {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
        padding: 3px 10px;
        background: var(--ink-2);
        border: 1px solid var(--line);
        border-radius: var(--panel-radius);
        min-width: 84px;
    }

    .slabel {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--paper-faint);
    }

    .svalue {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: var(--paper);
    }

    .gold .svalue {
        color: var(--gold);
    }

    .ok .svalue {
        color: var(--ok);
    }

    .info .svalue {
        color: var(--info);
    }

    .danger .svalue {
        color: var(--danger);
    }
</style>
