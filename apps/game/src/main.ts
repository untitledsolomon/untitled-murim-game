import { runApp } from "@dylanebert/shallot";
import { createGame, type Game } from "@murim/sim";
import { GamePlugin } from "./game/plugin";
import { mountHud } from "./hud";
import "./styles/theme.css";
import "./styles/base.css";

const DEFAULT_SEED = 1337;
const SEED_KEY = "murim-seed";
const SAVE_KEY = "murim-save";

/** Read the seed from `?seed=`, else from the last started world, else default. */
function resolveSeed(): number {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = Number(params.get("seed") ?? NaN);
    if (Number.isFinite(fromQuery)) return fromQuery;
    const saved = Number(localStorage.getItem(SEED_KEY) ?? NaN);
    if (Number.isFinite(saved)) return saved;
    return DEFAULT_SEED;
}

/** The headless game, shared by the engine systems and the HUD bridge. */
export const game: Game = createGame(resolveSeed());

// A refresh resumes the last saved world, unless the user asked for a fresh
// one via `?seed=`.
try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved && !window.location.search.includes("seed=")) game.load(saved);
} catch {
    /* an invalid or absent save is not fatal; keep the seeded world */
}

void runApp({ plugins: [GamePlugin(game)], ui: mountHud }).catch((error) => {
    console.error("Engine failed to start:", error);
});
