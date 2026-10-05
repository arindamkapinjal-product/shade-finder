// Helpers for the experimental Perfect Corp (YouCam) lip try-on test. Local testing only.
// NOTE: this sends the user's photo to Perfect Corp's servers, unlike the main on-device try-on.

export const BASE = "https://yce-api-01.makeupar.com";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

// Checks what the browser sent. Returns a clean object or throws "bad_request".
export function validateStart(body) {
  const mime = body?.mime;
  const b64 = body?.imageBase64;
  if (!["image/jpeg", "image/png"].includes(mime)) throw new Error("bad_request");
  if (typeof b64 !== "string" || b64.length < 100 || b64.length > 6_000_000 || !/^[A-Za-z0-9+/=]+$/.test(b64)) throw new Error("bad_request");
  if (typeof body.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(body.color)) throw new Error("bad_request");
  return {
    mime, b64,
    color: body.color.toUpperCase(),
    opacity: clamp(num(body.opacity, 0.7), 0.1, 1),
    gloss: clamp(num(body.gloss, 0.45), 0, 1),
  };
}

// Maps our settings to the Perfect Corp lip_color effect. Smoothing and brightness have no equivalent in their API;
// saturation and brightness are already applied to the colour before it is sent.
export function buildTaskBody(fileId, { color, opacity, gloss }) {
  return {
    src_file_id: fileId,
    version: "1.0",
    effects: [{
      category: "lip_color",
      shape: { name: "original" },
      style: { type: "full" },
      palettes: [{ color, texture: gloss >= 0.3 ? "gloss" : "matte", colorIntensity: Math.round(opacity * 100), gloss: Math.round(gloss * 100) }],
    }],
  };
}

// The file registration reply has changed shape between doc versions, so read it defensively.
export function parseFileReply(json) {
  const d = json?.data ?? json ?? {};
  const f = Array.isArray(d.files) ? d.files[0] : d;
  const req = Array.isArray(f?.requests) ? f.requests[0] : f;
  const fileId = f?.file_id ?? d.file_id;
  const url = req?.url ?? f?.url;
  if (!fileId || typeof url !== "string" || !/^https:\/\//.test(url)) return null;
  const headers = {};
  for (const [k, v] of Object.entries(req?.headers ?? {})) if (k.toLowerCase() !== "content-length" && typeof v === "string") headers[k] = v;
  return { fileId: String(fileId), url, method: (req?.method || "PUT").toUpperCase(), headers };
}

export const validTaskId = (id) => typeof id === "string" && /^[\w-]{8,300}$/.test(id);

export function parseStatus(json) {
  const d = json?.data ?? {};
  if (d.task_status === "success" && typeof d.results?.url === "string" && /^https:\/\//.test(d.results.url)) return { status: "success", url: d.results.url };
  if (d.task_status === "error") return { status: "error", detail: String(d.error_message || d.error || "unknown").replace(/[^\w\s.,:'-]/g, "").slice(0, 200) };
  return { status: "running" };
}
