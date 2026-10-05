import { test } from "node:test";
import assert from "node:assert/strict";
import { PRESETS, RANGES, DEFAULT_PARAMS } from "../site/presets.js";
import { adjustColour, edgeBlurPx, paintAlphas, hexToRgb } from "../site/lipcolour.js";

test("example presets are complete", () => {
  for (const key of ["A", "B"]) {
    assert.ok(PRESETS[key].title);
    assert.equal(PRESETS[key].shades.length, 5);
    for (const sh of PRESETS[key].shades) assert.ok(sh.name && sh.label && sh.params);
  }
});

test("every preset is valid and inside the slider ranges", () => {
  for (const set of Object.values(PRESETS)) for (const sh of set.shades) {
    assert.match(sh.colour, /^#[0-9A-F]{6}$/);
    for (const [k, v] of Object.entries(sh.params)) assert.ok(v >= RANGES[k].min && v <= RANGES[k].max, `${sh.name} ${k}=${v}`);
  }
  for (const [k, v] of Object.entries(DEFAULT_PARAMS)) assert.ok(v >= RANGES[k].min && v <= RANGES[k].max, k);
});

test("adjustColour leaves colour alone at 1/1 and changes it otherwise", () => {
  assert.equal(adjustColour("#8D2244"), "#8D2244");
  assert.equal(adjustColour("#808080", { saturation: 1.3 }), "#808080"); // grey has no saturation to boost
  const brighter = hexToRgb(adjustColour("#703B3A", { brightness: 1.05 }));
  assert.ok(brighter.every((c, i) => c >= hexToRgb("#703B3A")[i]));
  const vivid = hexToRgb(adjustColour("#C86855", { saturation: 1.3 }));
  assert.ok(vivid[0] - vivid[2] > hexToRgb("#C86855")[0] - hexToRgb("#C86855")[2]);
  assert.equal(adjustColour("#FFFFFF", { brightness: 1.15 }), "#FFFFFF"); // clamps
});

test("smoothing softens the edge and opacity scales the paint", () => {
  assert.ok(edgeBlurPx(960, 1) > edgeBlurPx(960, 0.5));
  assert.ok(edgeBlurPx(960, 0.7) > 1);
  assert.deepEqual(paintAlphas(0.5), { colour: 0.5, depth: 0.3 });
  assert.equal(paintAlphas(5).colour, 1);
});
