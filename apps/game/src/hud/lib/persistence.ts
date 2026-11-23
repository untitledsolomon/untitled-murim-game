// Engine-free save, load, and new-game commands.
//
// Persistence must never import the engine, so the standalone HUD route and
// the UI tests can use Save/Load/New without pulling `@dylanebert/shallot`
// into the test process. Engine-side republishing is delegated to the store's
// bridge hook (`onSimReplaced`), which is a no-op when headless.
import { createGame } from "@murim/sim";
import { game, simRef } from "./game-state.svelte";

const SEED_KEY = "murim-seed";

export function persistSeed(seed: number): void {
    try {
        localStorage.setItem(SEED_KEY, String(seed));
    } catch {
        /* private mode or storage full: a seed is only a convenience */
    }
}

/** Publish the latest snapshot into the HUD immediately. Also forces the
 * engine-side resource to republish where a bridge is installed. */
export function publishNow(): void {
    const sim = simRef.current;
    if (!sim) return;
    game.bridge?.onSimReplaced?.();
    game.publishSnapshot(sim.snapshot({ revealAll: game.revealAll }));
}

export function save(): string | null {
    const sim = simRef.current;
    if (!sim) return null;
    persistSeed(sim.world.seed);
    return sim.serialize();
}

export function load(text: string): boolean {
    const sim = simRef.current;
    if (!sim) return false;
    try {
        sim.load(text);
        persistSeed(sim.world.seed);
    } catch {
        return false;
    }
    publishNow();
    return true;
}

export function newGame(seed: number): void {
    const fresh = createGame(seed);
    simRef.current = fresh;
    persistSeed(seed);
    publishNow();
}
