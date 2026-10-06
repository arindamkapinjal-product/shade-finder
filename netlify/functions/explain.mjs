// Serverless function: turns skin-tone numbers into a friendly styling note using Gemini.
// Your API key lives in Netlify's settings (GEMINI_API_KEY), never in the website code.
// Only tone numbers and shade names arrive here. No photos.

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

const clean = (v, max = 40) => String(v ?? "").replace(/[^\w\s.,'&-]/g, "").slice(0, max);

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: "not_configured" }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }

  // Accept only the fields we expect, in the shapes we expect
  const input = {
    depth: clean(body.depth, 20),
    undertone: clean(body.undertone, 20),
    ita: Number.isFinite(body.ita) ? Math.round(body.ita) : null,
    confidence: Number.isFinite(body.confidence) ? Math.round(body.confidence) : null,
    foundation: (Array.isArray(body.foundation) ? body.foundation : []).slice(0, 3).map((s) => clean(s)),
    lipsticks: (Array.isArray(body.lipsticks) ? body.lipsticks : []).slice(0, 10).map((s) => clean(s)),
  };

  const prompt = `You are a friendly, expert makeup artist who specialises in Indian skin tones.
A shade-matching app measured this person's skin:
- Depth: ${input.depth}
- Undertone: ${input.undertone}
- Individual Typology Angle (ITA): ${input.ita}
- Measurement confidence: ${input.confidence}%
- Closest foundation shades: ${input.foundation.join(", ")}
- Lipsticks the app recommended: ${input.lipsticks.join(", ")}

Write a short styling note in 3 short paragraphs (under 110 words total):
1. What their depth and undertone mean, in plain words.
2. Which 2-3 of the recommended lipsticks to try first and for what occasion (daily, office, evening).
3. One practical tip for testing the foundation match in person.
Rules: warm and encouraging, no medical or skin-condition advice, never comment on attractiveness or suggest someone should look lighter or darker, mention only the shade names given, and if confidence is under 60% suggest retaking the photo in daylight. Plain text only, no markdown.`;

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
      }),
    });
  } catch {
    return json({ error: "upstream_unreachable" }, 502);
  }
  if (res.status === 429) return json({ error: "rate_limited" }, 429);
  if (!res.ok) return json({ error: "upstream_error" }, 502);

  const data = await res.json().catch(() => null);
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
  if (!text) return json({ error: "empty_response" }, 502);
  return json({ text });
};

export const config = { path: "/api/explain" };
