// Connects engine-side map state to the reactive HUD store. This is the only
// module (besides the engine plugin itself) that imports `@dylanebert/shallot`,
// so it must never be imported by the standalone HUD route or the UI tests —
// those run headless through `lib/persistence.ts` and the store's bridge hook.
import type { World } from "@dylanebert/shallot";
import { Viewports } from "@dylanebert/shallot";
import { MapUi, Simulation } from "../game/components";
import { SPEEDS } from "../game/speeds";
import { game, simRef, type EngineBridge } from "./lib/game-state.svelte";

let worldRef: World | null = null;
let raf = 0;

/** Install the store's engine-coupling hook. No-op without a world. */
function installBridge(): EngineBridge {
    const bridge: EngineBridge = {
        setMapMode: (mode) => {
            if (!worldRef) return;
            worldRef.resource(MapUi).mode = mode;
        },
        setPaused: (paused) => {
            if (!worldRef) return;
            if (paused) worldRef.pause();
            else worldRef.resume();
        },
        setSpeed: (index) => {
            worldRef?.setTimeScale(SPEEDS[index] ?? 1);
        },
        selectTown: (id) => {
            if (worldRef) worldRef.resource(MapUi).selectedTownId = id;
        },
        setRevealAll: (reveal) => {
            const res = worldRef?.resource(Simulation);
            if (!res) return;
            res.revealAll = reveal;
            res.forcePublish = true;
        },
        step: (days) => {
            const sim = simRef.current;
            if (!sim) return;
            for (let i = 0; i < days; i++) sim.step();
            const res = worldRef?.resource(Simulation);
            if (res) res.forcePublish = true;
        },
        // After a load or new game the engine resource still points at a stale
        // Game object; re-point it and make the next simulate pass republish.
        onSimReplaced: () => {
            const res = worldRef?.resource(Simulation);
            if (!res) return;
            res.game = simRef.current;
            res.forcePublish = true;
            res.accumulator = 0;
            if (worldRef) worldRef.resource(MapUi).selectedTownId = null;
        },
    };
    game.bridge = bridge;
    return bridge;
}

function poll(): void {
    const world = worldRef;
    if (world) {
        const ui = world.resource(MapUi);
        const sim = world.resource(Simulation);
        if (sim.snapshot) game.publishSnapshot(sim.snapshot);
        game.mode = ui.mode;
        game.selectedTownId = ui.selectedTownId;
        game.townScreens = ui.screens;
        const viewport = world.resource(Viewports).get(0);
        game.camera = {
            center: [ui.center[0], ui.center[1]],
            zoom: ui.zoom,
            viewportW: viewport?.cssWidth ?? 1,
            viewportH: viewport?.cssHeight ?? 1,
        };
        game.paused = world.time.paused;
        const index = (SPEEDS as readonly number[]).indexOf(world.time.scale);
        if (index >= 0) game.speedIndex = index;
        // The prices-mode good is store-owned; the map reads it each frame.
        if (ui.selectedGoodId !== game.selectedGoodId) ui.selectedGoodId = game.selectedGoodId;
    }
    raf = requestAnimationFrame(poll);
}

/** Start feeding the store from the engine; returns a stop function. */
export function startBridge(world: World): () => void {
    worldRef = world;
    installBridge();
    raf = requestAnimationFrame(poll);
    return () => {
        cancelAnimationFrame(raf);
        worldRef = null;
    };
}
