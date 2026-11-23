import type { World } from "@dylanebert/shallot";
import { mount, unmount } from "svelte";
import { Simulation } from "../game/components";
import HudRoot from "./HudRoot.svelte";
import { startBridge } from "./hud-bridge";
import { simRef } from "./lib/game-state.svelte";

/** `runApp`'s `ui`: mount the Svelte HUD into the engine's overlay. */
export function mountHud(container: HTMLElement, world: World): () => void {
    const sim = world.resource(Simulation).game;
    if (sim) simRef.current = sim;
    const stop = startBridge(world);
    const component = mount(HudRoot, { target: container });
    return () => {
        stop();
        unmount(component);
    };
}
