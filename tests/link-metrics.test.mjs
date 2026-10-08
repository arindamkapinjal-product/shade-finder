import { test } from "node:test";
import assert from "node:assert/strict";
import { norm, nameMatches, scoreLinks, parseCsv } from "../scripts/lib/link-metrics.mjs";

test("names match ignoring case, accents and punctuation", () => {
  assert.equal(norm("Lakmē 9to5"), "lakme9to5");
  assert.ok(nameMatches("LAKME", "Lakmē"));
  assert.ok(nameMatches("Pioneer", "Pioneer 20"));
  assert.ok(!nameMatches("", "Pioneer"));
  assert.ok(!nameMatches("Ruby Woo", "Pioneer"));
});

test("scoring counts brand, shade, refusals and non-lip products", () => {
  const r = [
    { status: 200, kind: "link", expected_brand: "Maybelline", expected_shade: "Pioneer", expected_is_lip: "yes", shade_specified: "yes", out: { brand: "Maybelline", shade: "Pioneer", hex: "#8B1E24", isLipProduct: true }, ms: 900 },
    { status: 200, kind: "text", expected_brand: "SUGAR", expected_shade: "Brazen Raisin", expected_is_lip: "yes", shade_specified: "yes", out: { brand: "Sugar", shade: "Other", hex: "#111111", isLipProduct: true }, ms: 800 },
    { status: 200, kind: "link", expected_brand: "Lakmē", expected_shade: "", expected_is_lip: "yes", shade_specified: "no", out: { brand: "Lakme", shade: "", hex: null, isLipProduct: true }, ms: 1000 },
    { status: 200, kind: "link", expected_brand: "Plum", expected_shade: "", expected_is_lip: "no", shade_specified: "no", out: { brand: "Plum", shade: "", hex: null, isLipProduct: false }, ms: 700 },
    { status: 502, kind: "link", expected_brand: "Fenty", expected_shade: "x", expected_is_lip: "yes", shade_specified: "yes", out: { error: "upstream_error" }, ms: 9000 },
  ];
  const s = scoreLinks(r);
  assert.equal(s.answered, 4);
  assert.deepEqual([s.brandOk, s.brandN], [4, 4]);
  assert.deepEqual([s.shadeOk, s.shadeN], [1, 2]);
  assert.deepEqual([s.shadeOkLink, s.shadeNLink, s.shadeOkText, s.shadeNText], [1, 1, 0, 1]);
  assert.equal(s.hexWhenRight, 1);
  assert.deepEqual([s.refusedOk, s.refusedN], [1, 1]);
  assert.deepEqual([s.notLipOk, s.notLipN], [1, 1]);
  assert.equal(s.medianMs, 900);
});

test("CSV parsing handles quotes", () => {
  assert.deepEqual(parseCsv('a,b\n"x, y","He said ""hi"""\n'), [{ a: "x, y", b: 'He said "hi"' }]);
});
