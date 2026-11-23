import { Transform, type World, Viewports } from "@dylanebert/shallot";
import { CameraViewport } from "@dylanebert/shallot/rendering";
import { MINIMAP_MARGIN, MINIMAP_SIZE, VIEW_MARKER_HEIGHT } from "../camera-math";
import { MapUi } from "../components";
import { CameraControlSystem } from "./camera-control";

/** Sizes and places the top-right minimap viewport, and keeps the view
 * indicator in step with the camera center.
 */
export const MinimapSystem = {
    name: "murim-minimap",
    group: "simulation" as const,
    after: [CameraControlSystem],
    update(world: World): void {
        const ui = world.resource(MapUi);
        if (ui.minimapEntity < 0) return;
        const viewport = world.resource(Viewports).get(0);
        if (!viewport) return;

        const width = Math.floor(viewport.cssWidth);
        const height = Math.floor(viewport.cssHeight);
        const size = Math.max(
            0,
            Math.min(
                MINIMAP_SIZE,
                Math.floor(Math.min(width, height) * 0.4),
                width - 2 * MINIMAP_MARGIN,
                height - 2 * MINIMAP_MARGIN,
            ),
        );
        const frame = world.storage(CameraViewport);
        frame.x.set(ui.minimapEntity, width - MINIMAP_MARGIN - size);
        frame.y.set(ui.minimapEntity, MINIMAP_MARGIN);
        frame.width.set(ui.minimapEntity, size);
        frame.height.set(ui.minimapEntity, size);

        if (ui.viewMarkerEntity >= 0) {
            world.storage(Transform).translation.set(
                ui.viewMarkerEntity,
                ui.center[0],
                VIEW_MARKER_HEIGHT,
                ui.center[1],
            );
        }
    },
};
