import { Camera, Transform, type World } from "@dylanebert/shallot";
import { CAMERA_HEIGHT, clampPan, clampZoom } from "../camera-math";
import { MapUi } from "../components";

/** Applies the authored map center and zoom to the main camera each frame. */
export const CameraControlSystem = {
    name: "murim-camera-control",
    group: "simulation" as const,
    update(world: World): void {
        const ui = world.resource(MapUi);
        if (ui.cameraEntity < 0) return;
        const zoom = clampZoom(ui.zoom);
        ui.zoom = zoom;
        ui.center = clampPan(ui.center);
        const transforms = world.storage(Transform);
        transforms.translation.set(ui.cameraEntity, ui.center[0], CAMERA_HEIGHT, ui.center[1]);
        world.storage(Camera).size.set(ui.cameraEntity, zoom);
    },
};
