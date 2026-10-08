// Runs Shade Finder's link reader against a hand-checked set of real product links and shade names.
//
//   node scripts/eval-links.mjs [--endpoint https://your-site.netlify.app/api/extract] [--delay 3200] [--skip L020]
//
// Test set: private/eval/links.csv
// (id,query,kind,expected_brand,expected_shade,expected_is_lip,shade_specified,source,notes)
// Report: private/eval/report.md. Each run is saved in private/eval/runs/.

import fs from "node:fs";
import path from "node:path";
import { parseCsv, nameMatches, scoreLinks } from "./lib/link-metrics.mjs";

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const endpoint = arg("--endpoint") || "http://localhost:8888/api/extract";
const delay = Number(arg("--delay")) || 4500;
const skip = new Set((arg("--skip") || "").split(",").filter(Boolean));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rows = parseCsv(fs.readFileSync("private/eval/links.csv", "utf8")).filter((r) => r.query && !skip.has(r.id));
const results = [];
for (const [i, row] of rows.entries()) {
  let out = null, status = 0, ms = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const t0 = Date.now();
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: row.query }) }).catch(() => null);
    ms = Date.now() - t0; status = res?.status || 0;
    out = res ? await res.json().catch(() => null) : null;
    if (status === 429) { console.log("  Free AI limit reached, waiting 60 seconds…"); await sleep(60000); continue; }
    break;
  }
  results.push({ ...row, status, ms, out });
  process.stdout.write(`\r${i + 1}/${rows.length} checked`);
  await sleep(delay);
}
console.log("");

const s = scoreLinks(results);
const run = { at: new Date().toISOString(), endpoint, summary: s, results };
fs.mkdirSync("private/eval/runs", { recursive: true });
const runFile = path.join("private/eval/runs", `${run.at.replace(/[:.]/g, "-")}-links.json`);
fs.writeFileSync(runFile, JSON.stringify(run, null, 2));

const pct = (a, b) => (b ? `${Math.round((1000 * a) / b) / 10}%` : "–");
let md = `# Shade Finder link-reader evaluation\n\nRun: ${run.at} · ${results.length} real queries (links and typed names), hand-checked expected answers.\n\n`;
md += `| Measure | Result |\n|---|---|\n`;
md += `| Answered without an error | ${pct(s.answered, s.n)} (${s.answered}/${s.n}) |\n`;
md += `| Brand correct | ${pct(s.brandOk, s.brandN)} (${s.brandOk}/${s.brandN}) |\n`;
md += `| Shade correct, when one shade was specified | ${pct(s.shadeOk, s.shadeN)} (${s.shadeOk}/${s.shadeN}) |\n`;
md += `| …of those, links | ${pct(s.shadeOkLink, s.shadeNLink)} · typed names ${pct(s.shadeOkText, s.shadeNText)} |\n`;
md += `| Gave a colour when the shade was right | ${pct(s.hexWhenRight, s.shadeOk)} |\n`;
md += `| Refused to guess on many-shade pages | ${pct(s.refusedOk, s.refusedN)} (${s.refusedOk}/${s.refusedN}) |\n`;
md += `| Recognised non-lip products | ${pct(s.notLipOk, s.notLipN)} (${s.notLipOk}/${s.notLipN}) |\n`;
md += `| Median time | ${s.medianMs} ms |\n\n`;
md += `Colour accuracy is not scored: there is no trustworthy ground-truth colour for a shade, so the app always labels colours as approximate.\n\n## Every miss\n\n`;
for (const r of results) {
  const o = r.out || {};
  const problems = [];
  if (r.status !== 200) problems.push(`error ${r.status} ${o.error || ""}`);
  else {
    const isLip = o.isLipProduct !== false;
    if ((r.expected_is_lip === "no") === isLip) problems.push(`is-lip wrong (said ${isLip})`);
    if (r.expected_brand && !nameMatches(o.brand, r.expected_brand)) problems.push(`brand "${o.brand}"`);
    if (r.shade_specified === "yes" && r.expected_is_lip !== "no" && !nameMatches(o.shade, r.expected_shade)) problems.push(`shade "${o.shade}"`);
    if (r.shade_specified === "no" && r.expected_is_lip !== "no" && o.shade && o.hex) problems.push(`guessed "${o.shade}"`);
  }
  if (problems.length) md += `- [${r.id}] (${r.kind}) expected ${r.expected_brand} / ${r.expected_shade || "–"}: ${problems.join("; ")}\n`;
}
fs.writeFileSync("private/eval/report.md", md);
console.log(`Brand ${pct(s.brandOk, s.brandN)}, shade ${pct(s.shadeOk, s.shadeN)}, refused-to-guess ${pct(s.refusedOk, s.refusedN)}. Report: private/eval/report.md, run: ${runFile}`);

