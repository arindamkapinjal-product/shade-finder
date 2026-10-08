// Scoring for the link-reader evaluation. Pure functions, tested in tests/link-metrics.test.mjs.

export function parseCsv(src) {
  const rows = []; let row = [], cell = "", q = false;
  const s = String(src).replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!head) return [];
  const keys = head.map((h) => h.trim());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

// Lower-case, strip accents (Lakmē → lakme) and anything that isn't a letter or digit
export const norm = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// A name matches if one contains the other after normalising ("Pioneer" vs "Pioneer 20")
export function nameMatches(got, expected) {
  const g = norm(got), e = norm(expected);
  if (!g || !e) return false;
  return g.includes(e) || e.includes(g);
}

const median = (a) => { const v = a.filter(Number.isFinite).sort((x, y) => x - y); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };

export function scoreLinks(results) {
  const ok = results.filter((r) => r.status === 200 && r.out);
  const lip = ok.filter((r) => r.expected_is_lip !== "no");
  const specified = lip.filter((r) => r.shade_specified === "yes");
  const shadeRight = specified.filter((r) => nameMatches(r.out.shade, r.expected_shade));
  const many = lip.filter((r) => r.shade_specified === "no");
  const notLip = ok.filter((r) => r.expected_is_lip === "no");
  const withBrand = ok.filter((r) => r.expected_brand);
  return {
    n: results.length,
    answered: ok.length,
    brandN: withBrand.length, brandOk: withBrand.filter((r) => nameMatches(r.out.brand, r.expected_brand)).length,
    shadeN: specified.length, shadeOk: shadeRight.length,
    shadeNLink: specified.filter((r) => r.kind === "link").length, shadeOkLink: shadeRight.filter((r) => r.kind === "link").length,
    shadeNText: specified.filter((r) => r.kind === "text").length, shadeOkText: shadeRight.filter((r) => r.kind === "text").length,
    hexWhenRight: shadeRight.filter((r) => r.out.hex).length,
    refusedN: many.length, refusedOk: many.filter((r) => !(r.out.shade && r.out.hex)).length,
    notLipN: notLip.length, notLipOk: notLip.filter((r) => r.out.isLipProduct === false).length,
    medianMs: median(results.map((r) => r.ms)),
  };
}
