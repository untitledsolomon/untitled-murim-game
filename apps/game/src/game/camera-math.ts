// Pure camera geometry for the top-down map. No engine imports: this module is
// shared by the engine systems and the DOM overlay so both see the same numbers.
import { WORLD_SIZE } from "@murim/sim";
import { MINIMAP_MARGIN, MINIMAP_SIZE } from "../hud/lib/layout";

export { MINIMAP_MARGIN, MINIMAP_SIZE };

/** Height of the main camera above the sim plane (y = 0). */
export const CAMERA_HEIGHT = 260;
/** Near plane distance from the camera, along its view direction. */
export const CAMERA_NEAR = 64;
/** Far plane distance. Reaches past the ground and the tallest marker. */
export const CAMERA_FAR = 1200;

/** Height of a town marker above the sim plane. */
export const TOWN_HEIGHT = 6;
/** Height of the selection ring above the sim plane. */
export const RING_HEIGHT = 0.35;

/** Smallest orthographic view size (zoom is the world height in view). */
export const ZOOM_MIN = 60;
/** Largest orthographic view size, a few world-wraps wide. */
export const ZOOM_MAX = WORLD_SIZE * 4;

/** Height of the minimap's camera-position indicator above the sim plane. */
export const VIEW_MARKER_HEIGHT = 0.8;

/** How far the camera center may travel past the world edge before it is stopped. */
export const WORLD_PAN_MARGIN = 40;

/** Clamp a pan so the map cannot be dragged entirely off the world. */
export function clampPan(center: readonly [number, number]): [number, number] {
    return [
        clamp(center[0], -WORLD_PAN_MARGIN, WORLD_SIZE + WORLD_PAN_MARGIN),
        clamp(center[1], -WORLD_PAN_MARGIN, WORLD_SIZE + WORLD_PAN_MARGIN),
    ];
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export const clampZoom = (zoom: number): number => clamp(zoom, ZOOM_MIN, ZOOM_MAX);
