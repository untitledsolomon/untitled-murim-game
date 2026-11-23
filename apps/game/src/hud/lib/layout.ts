// Layout constants shared by the HUD CSS, the DOM overlay, and the camera code.
// One source of truth so the canvas viewport lines up with the Svelte chrome.

/** Height of the top bar, in CSS pixels. */
export const TOPBAR_HEIGHT = 48;

/** Height of the bottom navigation bar. */
export const NAV_HEIGHT = 46;

/** Width of the right-hand panel dock. */
export const DOCK_WIDTH = 420;

/** Margin between the minimap frame and the surrounding chrome. */
export const MINIMAP_MARGIN = 16;

/** Cap for the square minimap frame. */
export const MINIMAP_SIZE = 224;

/** How long a toast stays before it dismisses itself. */
export const TOAST_MS = 6000;
