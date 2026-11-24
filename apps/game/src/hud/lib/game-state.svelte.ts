// The reactive bridge between the headless sim and the Svelte HUD.
//
// This module must stay free of engine imports so the HUD can be mounted and
// tested headlessly (the ?hud=standalone route and the UI test suite mount it
// with no WebGPU engine). Engine-coupled actions go through an optional bridge
// hook that `hud-bridge.ts` installs; without it the same actions are harmless
// no-ops, which is exactly what a headless test wants.
//
// Prior fix (v0.1 Phase 1b): this used to be a single `$state.raw({...})`
// object. `$state.raw` makes the object non-reactive, so writing one of its
// properties — `openPanels = [...]`, `paused = ...` — never triggered a
// re-render and the menu appeared broken. The store is now a class whose small
// fields are individually `$state` and whose snapshot is `$state.raw` (replaced
// whole on each publish; the assigned object is not proxied, keeping the
// per-frame cost of a fresh snapshot flat).
import type { ActorRef, CommandSpec, Game, MapMode, Snapshot, TownId } from "@murim/sim";
import { SPEEDS, type Speed } from "../../game/speeds";

export { SPEEDS, type Speed };

/** localStorage key for UI-only preferences. Sim state never lives here. */
const UIPREFS_KEY = "murim-ui-prefs";

export interface TownScreen {
    id: TownId;
    x: number;
    y: number;
}

export interface HudCamera {
    center: [number, number];
    zoom: number;
    viewportW: number;
    viewportH: number;
}

export type ToastSeverity = "info" | "warning" | "danger";

export interface Toast {
    id: number;
    severity: ToastSeverity;
    text: string;
    day: number;
}

/** UI-only preferences, persisted to localStorage. Never serialized into the sim. */
export interface UiPrefs {
    onboardingDismissed: boolean;
    /** The good the prices mode colours and the trade hints read from. */
    lastGood: string;
    /** The town the player was in when the app first saw a snapshot. */
    startTownId: TownId | null;
}

/** Engine-coupled actions, installed by `hud-bridge.ts`. No-ops when headless. */
export interface EngineBridge {
    setMapMode(mode: MapMode): void;
    setPaused(paused: boolean): void;
    setSpeed(index: number): void;
    selectTown(id: TownId | null): void;
    setRevealAll(reveal: boolean): void;
    /** Step the sim forward `days` sim days and force a snapshot publish. */
    step(days: number): void;
    /** Adopt the store's current sim into the engine and republish. Called
     * after load and new game so the engine does not keep a stale `Game`. */
    onSimReplaced(): void;
}

class GameState {
    /** Latest published snapshot; replaced whole, never proxied. */
    snapshot = $state.raw<Snapshot | null>(null);
    mode = $state<MapMode>("prices");
    selectedTownId = $state<TownId | null>(null);
    townScreens = $state<TownScreen[]>([]);
    camera = $state<HudCamera>({ center: [110, 110], zoom: 220, viewportW: 1, viewportH: 1 });
    /** The one docked panel shown at a time, or null. */
    openPanel = $state<string | null>(null);
    paused = $state(true);
    speedIndex = $state(2);
    toasts = $state<Toast[]>([]);
    selectedGoodId = $state("salt");
    uiPrefs = $state<UiPrefs>({ onboardingDismissed: false, lastGood: "salt", startTownId: null });
    showDebug = $state(false);
    revealAll = $state(false);
    /** True when the HUD runs in the headless `?hud=standalone` route. */
    isStandalone = $state(false);
    /** Rolling cost of the last whole-number sim step, measured in the app layer. */
    lastMsPerDay = $state(0);
    /** Engine hook; see EngineBridge above. */
    bridge = $state.raw<EngineBridge | null>(null);

    // Onboarding truth, derived from observable player state (never a script):
    // has the player bought, travelled, and sold at least once?
    hadBought = $state(false);
    hadTravelled = $state(false);
    hadSold = $state(false);
    _lastStockTotal = -1;

    constructor() {
        try {
            const raw = localStorage.getItem(UIPREFS_KEY);
            if (raw) Object.assign(this.uiPrefs, JSON.parse(raw));
        } catch {
            /* a corrupt or absent prefs entry is not fatal */
        }
    }

    /** The next undone step of the trader's loop, or null when done or dismissed. */
    onboarding = $derived.by(() => {
        if (this.uiPrefs.onboardingDismissed) return null;
        if (!this.hadBought) return { step: 0, text: "Buy goods cheap — open the Trade panel and place an order." };
        if (!this.hadTravelled) return { step: 1, text: "Travel to another town — open the Town panel and pick a destination." };
        if (!this.hadSold) return { step: 2, text: "Sell where prices are dear — the Trade panel lists sell orders." };
        return { step: 3, text: "The trader's loop is complete. Keep an eye on the watch list." };
    });

    // Non-reactive bookkeeping: ids and the last alert seen (so an alert is
    // toasted once, and a refresh does not replay history).
    toastSeq = 0;
    lastAlertId: string | undefined;

    /** Submit a command for the player (or AI in later phases). Routes through
     * `Game.send`, which assigns the id, applies a due command immediately —
     * the game reacts even while paused — and republishes so the HUD reflects
     * the change at once. */
    sendCommand(actor: ActorRef, spec: CommandSpec): void {
        const sim = simRef.current;
        if (!sim) return;
        sim.send(actor, spec);
        this.publishSnapshot(sim.snapshot({ revealAll: this.revealAll }));
    }

    /** Replace the current snapshot and react to what changed. */
    publishSnapshot(snap: Snapshot): void {
        this.snapshot = snap;
        if (this.uiPrefs.startTownId === null && snap.player.location !== null) {
            this.uiPrefs.startTownId = snap.player.location;
        }

        // Drive the onboarding strip from real state: owns stock, has left the
        // starting town, has shed stock after travelling (a sale).
        const stockTotal = Object.values(snap.player.stock).reduce((sum, qty) => sum + qty, 0);
        if (stockTotal > 0) this.hadBought = true;
        const here = snap.player.location;
        if (here !== null && here !== this.uiPrefs.startTownId) this.hadTravelled = true;
        if (this.hadTravelled && !this.hadSold && this._lastStockTotal > 0 && stockTotal < this._lastStockTotal) {
            this.hadSold = true;
        }
        this._lastStockTotal = stockTotal;
        const newest = snap.alerts[0]?.id;
        if (newest !== undefined && newest !== this.lastAlertId) {
            // A new alert arrived since the last publish: announce it as a
            // toast. The first publish of a session is silent so a resume
            // does not replay the whole history feed.
            if (this.lastAlertId !== undefined) {
                const alert = snap.alerts[0]!;
                this.pushToast({ id: ++this.toastSeq, severity: alert.severity, text: alert.text, day: alert.day });
            }
            this.lastAlertId = newest;
        } else if (newest === undefined) {
            this.lastAlertId = undefined;
        }
    }

    pushToast(toast: Toast): void {
        this.toasts = [toast, ...this.toasts].slice(0, 3);
    }

    dismissToast(id: number): void {
        this.toasts = this.toasts.filter((t) => t.id !== id);
    }

    openPanelById(id: string): void {
        this.openPanel = id;
    }

    togglePanel(id: string): void {
        this.openPanel = this.openPanel === id ? null : id;
    }

    closePanel(): void {
        this.openPanel = null;
    }

    setMapMode(mode: MapMode): void {
        this.mode = mode;
        this.bridge?.setMapMode(mode);
    }

    selectTown(id: TownId | null): void {
        this.selectedTownId = id;
        this.bridge?.selectTown(id);
    }

    setPaused(paused: boolean): void {
        this.paused = paused;
        this.bridge?.setPaused(paused);
    }

    setSpeed(index: number): void {
        this.speedIndex = index;
        this.bridge?.setSpeed(index);
    }

    setRevealAll(reveal: boolean): void {
        this.revealAll = reveal;
        this.bridge?.setRevealAll(reveal);
    }

    /** Step the sim a whole number of days (debug skip buttons), timing the work. */
    stepSim(days: number): void {
        const step = this.bridge?.step;
        if (!step) return;
        const t0 = performance.now();
        step(days);
        this.lastMsPerDay = (performance.now() - t0) / Math.max(1, days);
    }

    /** Dismiss the onboarding strip for good (a UI pref only). */
    dismissOnboarding(): void {
        this.uiPrefs.onboardingDismissed = true;
        this.persistUiPrefs();
    }

    /** Reset UI bookkeeping for a brand-new world (new game or load). */
    resetForNewWorld(): void {
        this.toasts = [];
        this.openPanel = null;
        this.selectedTownId = null;
        this.lastAlertId = undefined;
        this.hadBought = false;
        this.hadTravelled = false;
        this.hadSold = false;
        this._lastStockTotal = -1;
        this.uiPrefs.startTownId = null;
        this.persistUiPrefs();
    }

    /** Write UI preferences to localStorage. Never touches sim state. */
    persistUiPrefs(): void {
        try {
            localStorage.setItem(UIPREFS_KEY, JSON.stringify(this.uiPrefs));
        } catch {
            /* private mode or storage full: prefs are a convenience */
        }
    }
}

export const game = new GameState();

/** The headless sim, reachable by the actions without a reactive proxy. */
export const simRef: { current: Game | null } = { current: null };
