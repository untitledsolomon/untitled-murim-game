// Connects engine-side map state to the reactive HUD store, and exposes the
// HUD actions that must reach into the world resource.
import { createGame } from "@murim/sim";
import type { World } from "@dylanebert/shallot";
import { Viewports } from "@dylanebert/shallot";
import type { MapMode, TownId } from "@murim/sim";
import { MapUi, Simulation } from "../game/components";
import { SPEEDS } from "../game/speeds";
import { game, simRef } from "./lib/game-state.svelte";

let worldRef: World | null = null;
let raf = 0;

const SEED_KEY = "murim-seed";

function persistSeed(seed: number): void {
    try {
        localStorage.setItem(SEED_KEY, String(seed));
    } catch {
        /* private mode or storage full: a seed is only a convenience */
    }
}

function poll(): void {
    const world = worldRef;
    if (world) {
        const ui = world.resource(MapUi);
        const sim = world.resource(Simulation);
        game.snapshot = sim.snapshot;
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
    }
    raf = requestAnimationFrame(poll);
}

/** Start feeding the store from the engine; returns a stop function. */
export function startBridge(world: World): () => void {
    worldRef = world;
    raf = requestAnimationFrame(poll);
    return () => {
        cancelAnimationFrame(raf);
        worldRef = null;
    };
}

export function selectTown(id: TownId | null): void {
    if (!worldRef) return;
    worldRef.resource(MapUi).selectedTownId = id;
}

export function setMapMode(mode: MapMode): void {
    if (!worldRef) return;
    worldRef.resource(MapUi).mode = mode;
}

export function setSpeed(index: number): void {
    worldRef?.setTimeScale(SPEEDS[index] ?? 1);
}

export function setPaused(paused: boolean): void {
    if (!worldRef) return;
    if (paused) worldRef.pause();
    else worldRef.resume();
}

export function save(): string | null {
    const sim = simRef.current;
    if (!sim) return null;
    persistSeed(sim.world.seed);
    return sim.serialize();
}

export function load(text: string): boolean {
    const sim = simRef.current;
    const world = worldRef;
    if (!sim || !world) return false;
    try {
        sim.load(text);
        persistSeed(sim.world.seed);
    } catch {
        return false;
    }
    // Force the next simulate pass to publish a fresh snapshot.
    const res = world.resource(Simulation);
    res.publishedDay = -1;
    res.accumulator = 0;
    return true;
}

export function newGame(seed: number): void {
    const world = worldRef;
    if (!world) return;
    const fresh = createGame(seed);
    simRef.current = fresh;
    persistSeed(seed);
    const res = world.resource(Simulation);
    res.game = fresh;
    res.publishedDay = -1;
    res.accumulator = 0;
    world.resource(MapUi).selectedTownId = null;
}
