<script lang="ts">
    export interface TabDef {
        id: string;
        label: string;
    }

    let {
        tabs,
        selected = $bindable(),
        onchange,
    }: {
        tabs: TabDef[];
        selected?: string;
        onchange?: (id: string) => void;
    } = $props();
</script>

<div class="tabs" role="tablist">
    {#each tabs as t}
        <button
            role="tab"
            type="button"
            aria-selected={selected === t.id}
            class:active={selected === t.id}
            onclick={() => {
                selected = t.id;
                onchange?.(t.id);
            }}
        >
            {t.label}
        </button>
    {/each}
</div>

<style>
    .tabs {
        display: flex;
        gap: 2px;
        border-bottom: 1px solid var(--line);
    }

    button {
        min-height: 34px;
        padding: 6px 10px;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--paper-dim);
        font-size: 13px;
        cursor: pointer;
    }

    button:hover {
        color: var(--paper);
    }

    .active {
        color: var(--gold);
        border-bottom-color: var(--gold);
    }
</style>
