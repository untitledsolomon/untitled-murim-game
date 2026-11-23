// Pure camera geometry for the top-down map. No engine imports: this module is
// shared by the engine systems and the DOM overlay so both see the same numbers.
import { WORLD_SIZE } from "@murim/sim";

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

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export const clampZoom = (zoom: number): number => clamp(zoom, ZOOM_MIN, ZOOM_MAX);
