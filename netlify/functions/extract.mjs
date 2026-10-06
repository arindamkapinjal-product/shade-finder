// Serverless function: reads a lipstick product link or shade name and returns brand, shade and an approximate colour.
// Your API key lives in Netlify's settings (GEMINI_API_KEY), never in the website code.
// Only the typed text or link arrives here. No photos are ever sent.

import { safeFetch, pageContext, urlWords, parseModelJson, buildPrompt } from "../lib/extract-helpers.mjs";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: "not_configured" }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const query = typeof body?.query === "string" ? body.query.trim().slice(0, 500) : "";
  if (query.length < 3) return json({ error: "bad_request" }, 400);

  const isLink = /^https?:\/\//i.test(query);
  let context = "", image = null, source = "text";
  if (isLink) {
    source = "page";
    try {
      const page = await safeFetch(query);
      const ctx = pageContext(page.buffer.toString("utf8"), page.url);
      context = ctx.text;
      if (ctx.imageUrl) {
        try {
          const img = await safeFetch(ctx.imageUrl, { maxBytes: 2_500_000, accept: "image/*" });
          const mime = img.contentType.split(";")[0].trim().toLowerCase();
          if (["image/jpeg", "image/png", "image/webp"].includes(mime)) image = { mime, data: img.buffer.toString("base64") };
        } catch { /* the image is optional */ }
      }
    } catch (e) {
      if (e.message === "bad_url" || e.message === "blocked_url") return json({ error: "bad_url" }, 400);
      context = "(The page could not be read. Use only the link words.)";
    }
  }

  const prompt = buildPrompt({ query, isLink, context, linkWords: isLink ? urlWords(query) : "" });
  const parts = [{ text: prompt }];
  if (image) parts.push({ inline_data: { mime_type: image.mime, data: image.data } });

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  // The free tier sometimes hangs: wait up to 9 seconds, then try once more
  const callGemini = () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 300, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(9000),
  });
  let res = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { res = await callGemini(); } catch { res = null; }
    if (res && res.status < 500) break;
  }
  if (!res) return json({ error: "upstream_unreachable" }, 502);
  if (res.status === 429) return json({ error: "rate_limited" }, 429);
  if (!res.ok) return json({ error: "upstream_error" }, 502);

  const data = await res.json().catch(() => null);
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
  const result = text && parseModelJson(text);
  if (!result) return json({ error: "empty_response" }, 502);
  return json({ ...result, source });
};

export const config = { path: "/api/extract" };
