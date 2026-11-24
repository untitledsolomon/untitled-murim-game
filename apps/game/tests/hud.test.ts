// UI tests for the Phase 1b HUD. Every test boots the real HUD through
// `bootStandalone` (the `?hud=standalone` route) so it exercises the actual
// components against a headless Game, exactly as a user would interact with
// them in the browser.
import { mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import Toast from "../src/hud/components/ui/Toast.svelte";
import { bootStandalone } from "../src/hud/standalone";
import { game } from "../src/hud/lib/game-state.svelte";
import { PANELS } from "../src/hud/panels/registry";

let container: HTMLDivElement;
let stop: (() => void) | null;

function boot(): void {
    container = document.createElement("div");
    document.body.appendChild(container);
    stop = bootStandalone(container);
}

beforeEach(() => {
    game.resetForNewWorld();
    game.isStandalone = false;
    game.openPanel = null;
    game.toasts = [];
});

afterEach(() => {
    stop?.();
    stop = null;
    container?.remove();
});

/** Let Svelte's microtask-driven updates flush before asserting on the DOM. */
async function flush(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

function navButton(title: string): HTMLButtonElement {
    const button = Array.from(container.querySelectorAll<HTMLButtonElement>("button.nav-item")).find(
        (b) => b.textContent?.includes(title),
    );
    if (button === undefined) throw new Error(`nav button not found for "${title}"`);
    return button;
}

function dock(): HTMLElement | null {
    return container.querySelector(".dock");
}

function text(selector: string): string {
    return container.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

describe("bottom nav opens and closes panels", () => {
    const enabled = PANELS.filter((panel) => panel.enabled);
    test.each(enabled.map((p) => p.title))("each enabled nav button opens its panel: %s", async (title) => {
        boot();
        await flush();
        const p = PANELS.find((panel) => panel.title === title)!;
        navButton(p.title).click();
        await flush();
        expect(game.openPanel).toBe(p.id);
        expect(dock()).not.toBeNull();
        expect(getAriaTitle()).toBe(p.title);
    });

    test("clicking the active button closes it", async () => {
        boot();
        const trade = navButton("Trade");
        trade.click();
        await flush();
        expect(game.openPanel).toBe("trade");
        trade.click();
        await flush();
        expect(game.openPanel).toBeNull();
        expect(dock()).toBeNull();
    });

    test("Escape closes the open panel", async () => {
        boot();
        navButton("Trade").click();
        await flush();
        expect(dock()).not.toBeNull();
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        await flush();
        expect(game.openPanel).toBeNull();
        expect(dock()).toBeNull();
    });

    test("disabled panels open the not-yet-available stub", async () => {
        boot();
        await flush();
        for (const p of PANELS.filter((panel) => !panel.enabled)) {
            navButton(p.title).click();
            await flush();
            expect(game.openPanel).toBe(p.id);
            const stub = container.querySelector(".stub");
            expect(stub).not.toBeNull();
            expect(stub?.textContent).toContain("Not yet available");
        }
    });
});

describe("top bar reacts to the snapshot", () => {
    test("a step changes the day text", async () => {
        boot();
        await flush();
        const before = text(".day");
        game.stepSim(1);
        await flush();
        const after = text(".day");
        expect(after).not.toBe(before);
        expect(game.snapshot?.day).toBeGreaterThan(0);
    });
});

describe("trade market", () => {
    test("a Buy click issues a command and updates cash while paused", async () => {
        boot();
        await flush();
        navButton("Trade").click();
        await flush();

        const cashBefore = game.snapshot?.player.cash ?? 0;
        const buyButtons = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).filter(
            (b) => b.textContent?.trim() === "Buy",
        );
        expect(buyButtons.length).toBeGreaterThan(0);

        buyButtons[0]!.click();
        await flush();

        const cashAfter = game.snapshot?.player.cash ?? 0;
        expect(cashAfter).toBeLessThan(cashBefore);
        expect(game.paused).toBe(true); // applied without a step: the loop is still stopped
    });
});

describe("toasts", () => {
    test("a pushed toast appears and auto-dismisses", async () => {
        boot();
        await flush();
        game.pushToast({ id: 1, severity: "info", text: "World saved.", day: 0 });
        await flush();
        expect(container.querySelector(".toast")).not.toBeNull();
        expect(container.textContent).toContain("World saved.");

        game.dismissToast(1);
        await flush();
        expect(container.querySelector(".toast")).toBeNull();
        expect(game.toasts.length).toBe(0);
    });

    test("the Toast component auto-dismisses on its timer", async () => {
        let dismissed = false;
        const target = document.createElement("div");
        document.body.appendChild(target);
        const cmp = mount(Toast, {
            target,
            props: { severity: "info", text: "fades away", duration: 20, onDismiss: () => (dismissed = true) },
        });
        expect(target.textContent).toContain("fades away");
        await new Promise((resolve) => setTimeout(resolve, 60));
        expect(dismissed).toBe(true);
        unmount(cmp);
        target.remove();
    });
});

function getAriaTitle(): string {
    return container.querySelector(".dock .dock-head .dtitle")?.textContent?.trim() ?? "";
}
