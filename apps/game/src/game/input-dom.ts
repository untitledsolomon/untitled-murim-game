import type { World } from "@dylanebert/shallot";
import { viewportToWorld } from "@dylanebert/shallot/rendering";
import { clampZoom } from "./camera-math";
import { MapUi } from "./components";
import { SPEEDS } from "./speeds";

/** DOM input for the map: drag to pan, wheel to zoom (about the cursor), and
 * keyboard time controls (Space pauses, 1-5 set the speed).
 */
export function setupMapInput(world: World): () => void {
    const ui = world.resource(MapUi);
    const canvas = document.querySelector("canvas");
    if (!canvas) return () => {};

    const point = (e: { clientX: number; clientY: number }): [number, number] => {
        const rect = canvas.getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top];
    };

    /** The world (x, z) on the sim plane under a canvas point. */
    const ground = (x: number, y: number): [number, number] | null => {
        if (ui.cameraEntity < 0) return null;
        const ray = viewportToWorld(world, ui.cameraEntity, x, y);
        if (!ray) return null;
        // Top-down ortho: the ray's origin is already in the plane.
        return [ray.origin[0], ray.origin[2]];
    };

    let drag: {
        pointerId: number;
        worldX: number;
        worldZ: number;
        centerX: number;
        centerZ: number;
    } | null = null;

    const onPointerDown = (e: PointerEvent): void => {
        if (e.button !== 0) return;
        const [x, y] = point(e);
        const at = ground(x, y);
        if (!at) return;
        ui.selectedTownId = null;
        drag = {
            pointerId: e.pointerId,
            worldX: at[0],
            worldZ: at[1],
            centerX: ui.center[0],
            centerZ: ui.center[1],
        };
        try {
            canvas.setPointerCapture(e.pointerId);
        } catch {
            // Pointer already released; drag ends at the next pointerup anyway.
        }
    };
    const onPointerMove = (e: PointerEvent): void => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const [x, y] = point(e);
        const at = ground(x, y);
        if (!at) return;
        ui.center = [
            drag.centerX + (drag.worldX - at[0]),
            drag.centerZ + (drag.worldZ - at[1]),
        ];
    };
    const onPointerUp = (e: PointerEvent): void => {
        if (drag && e.pointerId === drag.pointerId) drag = null;
    };
    const onWheel = (e: WheelEvent): void => {
        if (ui.cameraEntity < 0) return;
        e.preventDefault();
        const [x, y] = point(e);
        const anchor = ground(x, y) ?? [ui.center[0], ui.center[1]];
        const next = clampZoom(ui.zoom * Math.exp(-e.deltaY * 0.002));
        const k = next / ui.zoom;
        ui.center = [
            anchor[0] - (anchor[0] - ui.center[0]) * k,
            anchor[1] - (anchor[1] - ui.center[1]) * k,
        ];
        ui.zoom = next;
    };
    const onKeyDown = (e: KeyboardEvent): void => {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        if (e.repeat) return;
        if (e.code === "Space") {
            e.preventDefault();
            if (world.time.paused) world.resume();
            else world.pause();
            return;
        }
        const index = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"].indexOf(e.code);
        if (index >= 0) world.setTimeScale(SPEEDS[index]);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    return () => {
        canvas.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        canvas.removeEventListener("wheel", onWheel);
        window.removeEventListener("keydown", onKeyDown);
    };
}
