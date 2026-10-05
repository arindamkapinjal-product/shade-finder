// Ready-made example shades for the try-on.
// These are ILLUSTRATIVE colours chosen to show the range of the renderer. They are not real products.
// Each shade: colour (hex), opacity, gloss, smoothing, saturation, brightness.

export const DEFAULT_PARAMS = { opacity: 0.7, gloss: 0.45, smoothing: 0.7, saturation: 1.1, brightness: 1.0 };

// Allowed ranges for the adjustment sliders
export const RANGES = {
  opacity: { min: 0.1, max: 1, step: 0.05 },
  gloss: { min: 0, max: 1, step: 0.05 },
  smoothing: { min: 0.5, max: 1, step: 0.1 },
  saturation: { min: 0.8, max: 1.3, step: 0.05 },
  brightness: { min: 0.9, max: 1.15, step: 0.05 },
};

const s = (name, colour, opacity, gloss, smoothing, saturation, brightness, label) =>
  ({ name, colour, label, params: { opacity, gloss, smoothing, saturation, brightness } });

export const PRESETS = {
  A: {
    title: "Everyday: sheer balm finish",
    shades: [
      s("Soft Coral", "#D9776A", 0.5, 0.55, 0.7, 1.05, 1.0, "coral"),
      s("Rosewood Nude", "#9E5A55", 0.6, 0.5, 0.7, 1.05, 1.0, "rosy nude"),
      s("Warm Caramel", "#A0603F", 0.6, 0.45, 0.7, 1.05, 1.0, "caramel nude"),
      s("Dusty Mauve", "#8E5A6E", 0.6, 0.45, 0.7, 1.0, 1.02, "mauve"),
      s("Pink Petal", "#D47C8E", 0.5, 0.55, 0.7, 1.05, 1.0, "pink"),
    ],
  },
  B: {
    title: "Bold: full colour",
    shades: [
      s("Classic Red", "#A3162B", 0.8, 0.35, 0.7, 1.1, 1.0, "blue red"),
      s("Brick", "#8A2E1F", 0.8, 0.3, 0.7, 1.1, 1.02, "brick red"),
      s("Deep Berry", "#6E1A3D", 0.8, 0.35, 0.7, 1.1, 1.05, "berry"),
      s("Chocolate", "#4F2A22", 0.8, 0.3, 0.7, 1.05, 1.08, "brown"),
      s("Fuchsia", "#B0215F", 0.75, 0.4, 0.7, 1.1, 1.0, "fuchsia"),
    ],
  },
};
