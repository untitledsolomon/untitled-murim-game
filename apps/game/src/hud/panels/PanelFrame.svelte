<!-- Shared panel layout per design doc 9: a header, a few key numbers, and tabs. -->
<script lang="ts">
    import type { Snippet } from "svelte";

    interface KeyNumber {
        label: string;
        value: string;
        tone?: "default" | "gold" | "info" | "danger" | "ok";
    }

    interface Tab {
        id: string;
        label: string;
    }

    let { title, numbers = [], tabs = [], content }: {
        title: string;
        numbers?: KeyNumber[];
        tabs?: Tab[];
        content?: Snippet<[selected: string]>;
    } = $props();

    let selected = $state<string>("");

    // Pick the first tab when the frame first mounts; tabs are static per panel.
    $effect(() => {
        if (selected === "" && tabs.length > 0) selected = tabs[0].id;
    });
</script>

<div class="frame">
    <div class="head-row">
        <span class="ptitle">{title}</span>
        {#each numbers as n}
            <span class="pnum {n.tone ?? "default"}">
                <span class="nlabel">{n.label}</span>
                <span class="nvalue">{n.value}</span>
            </span>
        {/each}
    </div>
    {#if tabs.length > 0}
        <div class="tabs" role="tablist">
            {#each tabs as t}
                <button
                    role="tab"
                    aria-selected={selected === t.id}
                    class:active={selected === t.id}
                    onclick={() => (selected = t.id)}
                >
                    {t.label}
                </button>
            {/each}
        </div>
    {/if}
    <div class="body">
        <!-- The panel renders one tab at a time inside this slot. -->
        {#if content}{@render content(selected)}{/if}
    </div>
</div>

<style>
    .frame {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .head-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px 16px;
        padding: 8px 10px;
        border-bottom: 1px solid var(--line);
    }

    .ptitle {
        font-weight: 600;
        color: var(--gold);
        letter-spacing: 0.03em;
        margin-right: auto;
    }

    .pnum {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
        padding: 2px 10px;
        background: var(--ink-2);
        border: 1px solid var(--line);
        border-radius: var(--panel-radius);
    }

    .nlabel {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--paper-faint);
    }

    .nvalue {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }

    .pnum.gold .nvalue {
        color: var(--gold);
    }

    .pnum.ok .nvalue {
        color: var(--ok);
    }

    .pnum.info .nvalue {
        color: var(--info);
    }

    .pnum.danger .nvalue {
        color: var(--danger);
    }

    .tabs {
        display: flex;
        gap: 2px;
        padding: 4px 8px;
        border-bottom: 1px solid var(--line);
        background: var(--ink-2);
    }

    .tabs button {
        padding: 3px 10px;
        border-radius: 2px;
        color: var(--paper-dim);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .tabs button:hover {
        color: var(--paper);
    }

    .tabs button.active {
        background: var(--ink-3);
        color: var(--gold);
    }

    .body {
        flex: 1;
        overflow-y: auto;
        padding: 8px 10px;
        font-size: 13px;
    }
</style>
