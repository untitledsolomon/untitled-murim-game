import type { Component } from "svelte";
import Family from "./Family.svelte";
import Organization from "./Organization.svelte";
import Town from "./Town.svelte";
import Trade from "./Trade.svelte";
import Information from "./Information.svelte";
import Politics from "./Politics.svelte";
import Banking from "./Banking.svelte";
import Martial from "./Martial.svelte";
import Succession from "./Succession.svelte";

export interface PanelDef {
    id: string;
    title: string;
    component: Component;
    /** False for panels whose sim content does not exist yet: they open a stub. */
    enabled: boolean;
}

/** All panels reachable from the menu, opened as movable windows. */
export const PANELS: PanelDef[] = [
    { id: "family", title: "You & family", component: Family, enabled: true },
    { id: "organization", title: "Organization", component: Organization, enabled: true },
    { id: "town", title: "Town / district", component: Town, enabled: true },
    { id: "trade", title: "Trade", component: Trade, enabled: true },
    { id: "information", title: "Information", component: Information, enabled: true },
    { id: "politics", title: "Politics", component: Politics, enabled: false },
    { id: "banking", title: "Banking", component: Banking, enabled: false },
    { id: "martial", title: "Martial", component: Martial, enabled: false },
    { id: "succession", title: "Succession", component: Succession, enabled: false },
];

export function panelTitle(id: string): string {
    return PANELS.find((p) => p.id === id)?.title ?? id;
}
