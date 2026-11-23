import {
    BaseColor,
    Materials,
    MeshInstance,
    MeshMaterial,
    StandardMaterial,
    Transform,
    type World,
    Viewports,
} from "@dylanebert/shallot";
import { worldToViewport } from "@dylanebert/shallot/rendering";
import type { MaterialHandle } from "@dylanebert/shallot/standard/rendering";
import type { MapMode, TownId, TownSnapshot } from "@murim/sim";
import { clamp, RING_HEIGHT, TOWN_HEIGHT } from "../camera-math";
import { DIM_COLOR, divergingColor, FRIENDLY_COLOR, heatColor, RING_COLOR, type Rgba } from "../colors";
import { MapUi, Simulation } from "../components";

/** Create one town marker entity. Shared material, per-entity BaseColor tint. */
export function createTownMarker(
    world: World,
    position: [number, number],
    material: MaterialHandle,
): number {
    const e = world.create();
    world.add(e, Transform, {
        translation: [position[0], TOWN_HEIGHT, position[1]],
        scale: [6, TOWN_HEIGHT * 2, 6],
    });
    world.add(e, MeshInstance);
    world.add(e, MeshMaterial, material);
    world.add(e, BaseColor);
    return e;
}

function colorForTown(town: TownSnapshot, mode: MapMode): Rgba {
    switch (mode) {
        case "prices": {
            const goods = Object.values(town.goods);
            if (goods.length === 0) return divergingColor(0.5);
            let ratio = 0;
            for (const good of goods) ratio += good.market.value / Math.max(good.basePrice, 0.001);
            ratio /= goods.length;
            return divergingColor((clamp(ratio, 0.7, 1.6) - 0.7) / 0.9);
        }
        case "crime":
            return heatColor(clamp(town.crime, 0, 1));
        case "unrest":
            return heatColor(clamp(town.unrest, 0, 1));
        case "influence":
            return heatColor(clamp(town.influence.value / 60, 0, 1));
        case "knowledge":
            return town.known ? FRIENDLY_COLOR : DIM_COLOR;
    }
}

/** Keeps the map scene in sync with the published snapshot: marker meshes, tints,
 * the selection ring, and the projected DOM dot positions. Runs in the draw group
 * so the camera view it projects through is the one being rendered.
 */
export const MapSyncSystem = {
    name: "murim-map-sync",
    group: "draw" as const,
    update(world: World): void {
        const ui = world.resource(MapUi);
        const snap = world.resource(Simulation).snapshot;
        if (!snap) return;
        const transforms = world.storage(Transform);
        const colors = world.storage(BaseColor).color;

        // Reconcile marker entities with the snapshot's towns.
        if (ui.markerMaterial === null) {
            ui.markerMaterial = world.resource(Materials).add(StandardMaterial());
        }
        const live = new Set<TownId>();
        for (const town of snap.towns) {
            live.add(town.id);
            if (!ui.townMeshes.has(town.id) && ui.markerMaterial !== null) {
                const eid = createTownMarker(world, town.position, ui.markerMaterial);
                ui.townMeshes.set(town.id, eid);
                ui.townByEid.set(eid, town.id);
            }
        }
        for (const [id, eid] of [...ui.townMeshes]) {
            if (!live.has(id)) {
                world.destroy(eid);
                ui.townMeshes.delete(id);
                ui.townByEid.delete(eid);
            }
        }

        // Recolor markers when the mode or the published day changes.
        if (ui.lastMode !== ui.mode || ui.lastDay !== snap.day) {
            ui.lastMode = ui.mode;
            ui.lastDay = snap.day;
            for (const town of snap.towns) {
                const eid = ui.townMeshes.get(town.id);
                if (eid === undefined) continue;
                const c = colorForTown(town, ui.mode);
                colors.set(eid, c[0], c[1], c[2], c[3]);
            }
        }

        // Selection ring tracks the selected town, else folds away.
        if (ui.ringEntity >= 0) {
            const selected = ui.selectedTownId ? ui.townMeshes.get(ui.selectedTownId) : undefined;
            if (selected !== undefined) {
                transforms.translation.set(
                    ui.ringEntity,
                    transforms.translation.x.get(selected),
                    RING_HEIGHT,
                    transforms.translation.z.get(selected),
                );
                transforms.scale.set(ui.ringEntity, 17, 0.4, 17);
                const c = RING_COLOR;
                colors.set(ui.ringEntity, c[0], c[1], c[2], c[3]);
            } else {
                transforms.scale.set(ui.ringEntity, 0.001, 0.001, 0.001);
            }
        }

        // Project markers to DOM overlay positions using the drawn camera view.
        ui.screens.length = 0;
        if (ui.cameraEntity >= 0 && world.resource(Viewports).get(0)) {
            for (const town of snap.towns) {
                const eid = ui.townMeshes.get(town.id);
                if (eid === undefined) continue;
                const px = worldToViewport(world, ui.cameraEntity, [
                    transforms.translation.x.get(eid),
                    TOWN_HEIGHT,
                    transforms.translation.z.get(eid),
                ]);
                if (px) ui.screens.push({ id: town.id, x: px[0], y: px[1] });
            }
        }
    },
};
