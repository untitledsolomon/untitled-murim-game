import {
    BaseColor,
    Camera,
    CameraMode,
    DirectionalLight,
    GlobalAmbientLight,
    lookAtRotation,
    Materials,
    MeshInstance,
    MeshMaterial,
    StandardMaterial,
    StandardRenderer,
    Transform,
    type Plugin,
    type World,
} from "@dylanebert/shallot";
import { WORLD_SIZE, type Game } from "@murim/sim";
import { CAMERA_FAR, CAMERA_HEIGHT, CAMERA_NEAR, RING_HEIGHT, TOWN_HEIGHT } from "./camera-math";
import { GROUND_COLOR } from "./colors";
import { MapUi, Simulation } from "./components";
import { createTownMarker, MapSyncSystem } from "./systems/map-sync";
import { SimulateSystem } from "./systems/simulate";

/** Builds the game scenes: lights, ground, the top-down camera, and the initial
 * town markers, then hands control to the engine systems.
 */
export function GamePlugin(game: Game): Plugin {
    return {
        name: "Murim",
        systems: [SimulateSystem, MapSyncSystem],
        initialize(world: World): void {
            const sim = world.resource(Simulation);
            sim.game = game;
            const first = game.snapshot();
            sim.snapshot = first;
            sim.publishedDay = game.world.day;

            const ui = world.resource(MapUi);
            ui.center = [WORLD_SIZE / 2, WORLD_SIZE / 2];
            ui.zoom = WORLD_SIZE;

            // Light.
            world.resource(GlobalAmbientLight).color = 0xd8e4ff;
            world.resource(GlobalAmbientLight).brightness = 260;
            const sun = world.create();
            world.add(sun, Transform, { rotation: lookAtRotation(0, 0, 0, 1, -2, -1) });
            world.add(sun, DirectionalLight, { color: 0xffe8cc, illuminance: 4000, shadowMapsEnabled: 1 });

            // Ground slab, top surface at the sim plane (y = 0).
            const ground = world.create();
            world.add(ground, Transform, {
                translation: [WORLD_SIZE / 2, -0.1, WORLD_SIZE / 2],
                scale: [WORLD_SIZE, 0.2, WORLD_SIZE],
            });
            world.add(ground, MeshInstance);
            world.add(
                ground,
                MeshMaterial,
                world.resource(Materials).add(StandardMaterial({ baseColor: GROUND_COLOR })),
            );

            // Top-down orthographic main camera.
            const camera = world.create();
            const [cx, cz] = ui.center;
            world.add(camera, Camera, {
                mode: CameraMode.Orthographic,
                size: WORLD_SIZE,
                near: CAMERA_NEAR,
                far: CAMERA_FAR,
                clearColor: 0x1c1917,
            });
            world.add(camera, StandardRenderer);
            world.add(camera, Transform, {
                translation: [cx, CAMERA_HEIGHT, cz],
                rotation: lookAtRotation(cx, CAMERA_HEIGHT, cz, cx, 0, cz, 0, 0, -1),
            });
            ui.cameraEntity = camera;

            // Selection ring, hidden until a town is selected.
            const ring = world.create();
            world.add(ring, Transform, { translation: [0, RING_HEIGHT, 0], scale: [17, 0.4, 17] });
            world.add(ring, MeshInstance);
            world.add(ring, MeshMaterial, world.resource(Materials).add(StandardMaterial()));
            world.add(ring, BaseColor);
            ui.ringEntity = ring;

            // Town markers, shared material with per-entity tints.
            const markerMaterial = world.resource(Materials).add(StandardMaterial());
            ui.markerMaterial = markerMaterial;
            for (const town of first.towns) {
                const eid = createTownMarker(world, town.position, markerMaterial);
                ui.townMeshes.set(town.id, eid);
                ui.townByEid.set(eid, town.id);
            }
        },
    };
}
