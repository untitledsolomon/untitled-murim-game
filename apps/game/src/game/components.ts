import type { Resource } from "@dylanebert/shallot";
import type { MaterialHandle } from "@dylanebert/shallot/standard/rendering";
import type { Game, MapMode, Snapshot, TownId } from "@murim/sim";

/** One town's projected screen position for a DOM overlay dot. */
export interface TownScreen {
    id: TownId;
    x: number;
    y: number;
}

export interface SimulationData {
    /** The headless game the engine drives. Set once in the plugin initialize. */
    game: Game | null;
    /** Fractional days carried over between frames. */
    accumulator: number;
    /** Latest published snapshot the HUD reads. */
    snapshot: Snapshot | null;
    /** The day the latest snapshot was published for. */
    publishedDay: number;
}

export const Simulation: Resource<SimulationData> = {
    create: () => ({ game: null, accumulator: 0, snapshot: null, publishedDay: -1 }),
};

export interface MapUiData {
    /** Camera focus on the sim plane (world x and z). */
    center: [number, number];
    /** Orthographic view size in world units (vertical extent). */
    zoom: number;
    /** Active map coloring mode. */
    mode: MapMode;
    selectedTownId: TownId | null;
    cameraEntity: number;
    ringEntity: number;
    /** Shared marker material, created lazily once the renderer is up. */
    markerMaterial: MaterialHandle | null;
    townMeshes: Map<TownId, number>;
    townByEid: Map<number, TownId>;
    /** Projected marker positions, refreshed each drawn frame. */
    screens: TownScreen[];
    /** Gates marker recoloring: recolor only when mode or day changes. */
    lastMode: string;
    lastDay: number;
}

export const MapUi: Resource<MapUiData> = {
    create: () => ({
        center: [110, 110],
        zoom: 220,
        mode: "prices",
        selectedTownId: null,
        cameraEntity: -1,
        ringEntity: -1,
        markerMaterial: null,
        townMeshes: new Map<TownId, number>(),
        townByEid: new Map<number, TownId>(),
        screens: [],
        lastMode: "",
        lastDay: -1,
    }),
};
