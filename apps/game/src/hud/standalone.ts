// The `?hud=standalone` route: mount the Svelte HUD over a headless Game with
// no WebGPU engine. The map area is a plain projection (StandaloneMap) and
// engine-coupled actions go through a bridge that just steps and republishes.
// The UI test suite boots this same function, so every test drives the real
// HUD.
import { mount, unmount } from "svelte";
import { createGame } from "@murim/sim";
import HudRoot from "./HudRoot.svelte";
import { game, simRef } from "./lib/game-state.svelte";

/** Mount the headless HUD into `container`. Returns a stop function. */
export function bootStandalone(container: HTMLElement): () => void {
    const sim = createGame(loadSeed());
    simRef.current = sim;
    game.isStandalone = true;
    game.showDebug = new URLSearchParams(window.location.search).has("debug");

    function publish(): void {
        game.publishSnapshot(sim.snapshot({ revealAll: game.revealAll }));
    }

    game.bridge = {
        setMapMode: () => {},
        setPaused: () => {},
        setSpeed: () => {},
        selectTown: (id) => {
            game.selectedTownId = id;
        },
        setRevealAll: (reveal) => {
            game.revealAll = reveal;
            publish();
        },
        step: (days) => {
            for (let i = 0; i < days; i++) sim.step();
            publish();
        },
        // Headless: nothing to re-point; publishNow already republishes.
        onSimReplaced: () => {},
    };

    publish();
    const component = mount(HudRoot, { target: container });
    return () => unmount(component);
}

function loadSeed(): number {
    const fromQuery = Number(new URLSearchParams(window.location.search).get("seed") ?? NaN);
    return Number.isFinite(fromQuery) ? fromQuery : 1337;
}
