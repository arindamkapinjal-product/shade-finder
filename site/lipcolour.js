// Small helpers for the lipstick try-on. Kept separate so they can be tested.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function hexToRgb(hex) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Saturation: 1 = unchanged, above 1 = more vivid. Brightness: 1 = unchanged, multiplies each channel.
export function adjustColour(hex, { saturation = 1, brightness = 1 } = {}) {
  const [r, g, b] = hexToRgb(hex);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return rgbToHex([r, g, b].map((c) => (lum + (c - lum) * saturation) * brightness));
}

// Edge blur in pixels for a given canvas width. Higher smoothing = softer lip edge (less "sticker" border).
export function edgeBlurPx(canvasWidth, smoothing) {
  return Math.max(1, (canvasWidth / 700) * (0.5 + clamp(smoothing, 0, 1) * 3));
}

// Strength of the two paint passes from the opacity setting
export function paintAlphas(opacity) {
  const o = clamp(opacity, 0, 1);
  return { colour: o, depth: o * 0.6 };
}
