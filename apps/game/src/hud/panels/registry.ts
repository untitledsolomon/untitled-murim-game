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
    component: unknown;
}

/** All panels reachable from the top bar, opened as movable windows. */
export const PANELS: PanelDef[] = [
    { id: "family", title: "You & family", component: Family },
    { id: "organization", title: "Organization", component: Organization },
    { id: "town", title: "Town / district", component: Town },
    { id: "trade", title: "Trade", component: Trade },
    { id: "information", title: "Information", component: Information },
    { id: "politics", title: "Politics", component: Politics },
    { id: "banking", title: "Banking", component: Banking },
    { id: "martial", title: "Martial", component: Martial },
    { id: "succession", title: "Succession", component: Succession },
];

export function panelTitle(id: string): string {
    return PANELS.find((p) => p.id === id)?.title ?? id;
}
