// Marker tint helpers. StandardMaterial.baseColor and BaseColor are linear RGB,
// so every palette color is converted from sRGB hex before use.

/** One RGBA color as linear channels. */
export type Rgba = [number, number, number, number];

function srgbChannel(c: number): number {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Convert an sRGB hex like 0x3a7bbf to a linear RGBA tuple (alpha 1). */
export function srgbToLinear(hex: number): Rgba {
    return [
        srgbChannel(((hex >> 16) & 0xff) / 255),
        srgbChannel(((hex >> 8) & 0xff) / 255),
        srgbChannel((hex & 0xff) / 255),
        1,
    ];
}

function mix4(a: Rgba, b: Rgba, t: number): Rgba {
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
        a[3] + (b[3] - a[3]) * t,
    ];
}

/** Linear palette stops. */
const HEAT_STOPS = [srgbToLinear(0x6f8964), srgbToLinear(0xd9a441), srgbToLinear(0xc23b2e)];
const DIVERGE_STOPS = [srgbToLinear(0x3a6ea5), srgbToLinear(0x8d9a70), srgbToLinear(0xc2452b)];

/** Cool blue at 0 rising to rust red at 1, through a neutral mid. */
export function divergingColor(t: number): Rgba {
    const x = Math.min(1, Math.max(0, t));
    if (x < 0.5) return mix4(DIVERGE_STOPS[0], DIVERGE_STOPS[1], x * 2);
    return mix4(DIVERGE_STOPS[1], DIVERGE_STOPS[2], (x - 0.5) * 2);
}

/** Muted green at 0 rising to deep red at 1, through amber. */
export function heatColor(t: number): Rgba {
    const x = Math.min(1, Math.max(0, t));
    if (x < 0.5) return mix4(HEAT_STOPS[0], HEAT_STOPS[1], x * 2);
    return mix4(HEAT_STOPS[1], HEAT_STOPS[2], (x - 0.5) * 2);
}

export const GROUND_COLOR = srgbToLinear(0x3d3a32);
/** Known towns in knowledge mode. */
export const FRIENDLY_COLOR = srgbToLinear(0x9ab35a);
/** Unknown towns in knowledge mode. */
export const DIM_COLOR = srgbToLinear(0x55555c);
/** Selection ring. */
export const RING_COLOR = srgbToLinear(0xe0b04a);
