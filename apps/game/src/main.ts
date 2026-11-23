import { runApp } from "@dylanebert/shallot";
import { createGame, type Game } from "@murim/sim";
import { GamePlugin } from "./game/plugin";

const DEFAULT_SEED = 1337;

/** Read the seed from `?seed=`, else fall back to the default. Phase G adds
 * localStorage persistence so a refresh resumes the same world.
 */
function resolveSeed(): number {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = Number(params.get("seed") ?? NaN);
    if (Number.isFinite(fromQuery)) return fromQuery;
    return DEFAULT_SEED;
}

/** The headless game, shared by the engine systems and the HUD bridge. */
export const game: Game = createGame(resolveSeed());

void runApp({ plugins: [GamePlugin(game)] }).catch((error) => {
    console.error("Engine failed to start:", error);
});
