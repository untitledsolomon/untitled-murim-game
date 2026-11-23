// The reactive bridge between the engine's map state and the Svelte HUD.
// This module stays free of engine imports; a separate bridge module feeds it.
import type { Command, Game, MapMode, Snapshot, TownId } from "@murim/sim";
import { SPEEDS, type Speed } from "../../game/speeds";

export { SPEEDS, type Speed };

export interface TownScreen {
    id: TownId;
    x: number;
    y: number;
}

export interface HudCamera {
    center: [number, number];
    zoom: number;
    viewportW: number;
    viewportH: number;
}

export const game = $state.raw({
    snapshot: null as Snapshot | null,
    mode: "prices" as MapMode,
    selectedTownId: null as TownId | null,
    townScreens: [] as TownScreen[],
    camera: { center: [110, 110] as [number, number], zoom: 220, viewportW: 1, viewportH: 1 } as HudCamera,
    /** Open panel ids, last one on top. */
    openPanels: [] as string[],
    // The game starts paused; the player chooses when the world moves.
    paused: true,
    /** Index into SPEEDS. */
    speedIndex: 2,
});

/** The headless sim, reachable by the HUD actions without a reactive proxy. */
export const simRef: { current: Game | null } = { current: null };

export function sendCommand(command: Command): void {
    simRef.current?.enqueue(command);
}

export function openPanel(id: string): void {
    if (!game.openPanels.includes(id)) game.openPanels = [...game.openPanels, id];
}

export function closePanel(id: string): void {
    if (game.openPanels.includes(id)) game.openPanels = game.openPanels.filter((p) => p !== id);
}

export function togglePanel(id: string): void {
    if (game.openPanels.includes(id)) closePanel(id);
    else openPanel(id);
}

export function bringToFront(id: string): void {
    if (!game.openPanels.includes(id)) return;
    game.openPanels = [...game.openPanels.filter((p) => p !== id), id];
}
