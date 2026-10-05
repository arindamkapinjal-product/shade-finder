import { test } from "node:test";
import assert from "node:assert/strict";
import { deltaE2000, hexToLab, labToHex, linToLab, toLin, itaFor, bandFor, undertoneFor } from "../site/colour.js";

// Reference pairs from Sharma, Wu and Dalal (2005), "The CIEDE2000 colour-difference formula".
const SHARMA = [
  [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
  [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
  [[50, 2.8361, -74.02], [50, 0, -82.7485], 3.4412],
  [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0],
  [[50, -1.1848, -84.8006], [50, 0, -82.7485], 1.0],
  [[50, -0.9009, -85.5211], [50, 0, -82.7485], 1.0],
  [[50, 0, 0], [50, -1, 2], 2.3669],
  [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
  [[50, 2.49, -0.001], [50, -2.49, 0.0011], 7.2195],
  [[50, -0.001, 2.49], [50, 0.0009, -2.49], 4.8045],
  [[50, -0.001, 2.49], [50, 0.0011, -2.49], 4.7461],
  [[50, 2.5, 0], [50, 0, -2.5], 4.3065],
  [[50, 2.5, 0], [73, 25, -18], 27.1492],
  [[50, 2.5, 0], [61, -5, 29], 22.8977],
  [[50, 2.5, 0], [56, -27, -3], 31.903],
  [[50, 2.5, 0], [58, 24, 15], 19.4535],
  [[50, 2.5, 0], [50, 3.1736, 0.5854], 1.0],
];

test("CIEDE2000 matches Sharma/Wu/Dalal reference pairs to 4 decimal places", () => {
  assert.ok(SHARMA.length >= 10);
  for (const [c1, c2, expected] of SHARMA) {
    assert.equal(deltaE2000(c1, c2).toFixed(4), expected.toFixed(4), `pair ${c1} vs ${c2}`);
    assert.equal(deltaE2000(c2, c1).toFixed(4), expected.toFixed(4), `reverse pair ${c2} vs ${c1}`);
  }
});

test("hex to CIELAB to hex round-trips", () => {
  for (const hex of ["#000000", "#FFFFFF", "#8D5524", "#C68642", "#E0AC69", "#F1C27D", "#3B2219", "#A0522D", "#FF0000"]) {
    assert.equal(labToHex(hexToLab(hex)), hex);
  }
});

test("white and black map to the expected CIELAB values", () => {
  const [Lw, aw, bw] = hexToLab("#FFFFFF");
  assert.ok(Math.abs(Lw - 100) < 0.1 && Math.abs(aw) < 0.1 && Math.abs(bw) < 0.1);
  assert.ok(Math.abs(hexToLab("#000000")[0]) < 0.001);
  assert.equal(linToLab([toLin(255), toLin(255), toLin(255)])[0].toFixed(1), "100.0");
});

test("depth bands follow ITA thresholds", () => {
  const cases = [[70, "Fair"], [55.01, "Fair"], [55, "Light"], [41.01, "Light"], [41, "Medium"],
    [28.01, "Medium"], [28, "Tan"], [10.01, "Tan"], [10, "Deep"], [-29.99, "Deep"], [-30, "Rich deep"], [-60, "Rich deep"]];
  for (const [ita, band] of cases) assert.equal(bandFor(ita), band, `ITA ${ita}`);
});

test("ITA is computed from L and b", () => {
  assert.ok(Math.abs(itaFor([50, 10, 20])) < 1e-9);
  assert.ok(Math.abs(itaFor([70, 10, 20]) - 45) < 1e-9);
  assert.ok(Math.abs(itaFor([30, 10, 20]) + 45) < 1e-9);
});

test("undertone follows hue angle rules", () => {
  const lab = (deg, chroma = 20) => [60, chroma * Math.cos(deg * Math.PI / 180), chroma * Math.sin(deg * Math.PI / 180)];
  assert.equal(undertoneFor(lab(45)).name, "Cool");
  assert.equal(undertoneFor(lab(49.9)).name, "Cool");
  assert.equal(undertoneFor(lab(50.01)).name, "Neutral");
  assert.equal(undertoneFor(lab(57.99)).name, "Neutral");
  assert.equal(undertoneFor(lab(58.01)).name, "Warm");
  assert.equal(undertoneFor(lab(62)).name, "Warm");
  assert.equal(undertoneFor(lab(70, 20)).name, "Olive"); // a < 9 and hue > 64
  assert.equal(undertoneFor(lab(70, 30)).name, "Warm");  // a >= 9 so not olive
  assert.ok(Math.abs(undertoneFor(lab(55)).hue - 55) < 1e-9);
});
