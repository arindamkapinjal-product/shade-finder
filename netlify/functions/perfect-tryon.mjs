// EXPERIMENTAL, local testing only: lip try-on through Perfect Corp's YouCam API.
// The photo IS sent to Perfect Corp here. The main app never does this.
// The API key is read from the PERFECT_API_KEY environment variable, never from code or files.

import { BASE, validateStart, buildTaskBody, parseFileReply, validTaskId, parseStatus } from "../lib/perfect-helpers.mjs";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const call = async (path, key, init = {}) => {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
    signal: AbortSignal.timeout(25000),
  });
  const body = await res.json().catch(() => null);
  return { res, body };
};
const upstreamError = (res, body) =>
  json({ error: "perfect_error", detail: `HTTP ${res.status} ${String(body?.error_message || body?.error || body?.message || "").replace(/[^\w\s.,:'-]/g, "").slice(0, 160)}` }, 502);

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const host = new URL(req.url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return json({ error: "local_only" }, 403); // never usable on the public site
  const key = process.env.PERFECT_API_KEY;
  if (!key) return json({ error: "not_configured" }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }

  try {
    if (body.action === "status") {
      if (!validTaskId(body.taskId)) return json({ error: "bad_request" }, 400);
      const { res, body: b } = await call(`/s2s/v2.0/task/makeup-vto/${body.taskId}`, key);
      if (!res.ok) return upstreamError(res, b);
      return json(parseStatus(b));
    }

    const v = validateStart(body);
    const bytes = Buffer.from(v.b64, "base64");

    // 1) Ask for an upload slot (the slug-less path is a fallback in case the docs changed)
    const fileInit = { method: "POST", body: JSON.stringify({ files: [{ content_type: v.mime, file_name: v.mime === "image/png" ? "photo.png" : "photo.jpg", file_size: bytes.length }] }) };
    let reg = await call("/s2s/v2.0/file/makeup-vto", key, fileInit);
    if (!reg.res.ok) reg = await call("/s2s/v2.0/file", key, fileInit);
    if (!reg.res.ok) return upstreamError(reg.res, reg.body);
    const slot = parseFileReply(reg.body);
    if (!slot) return json({ error: "perfect_error", detail: "Unexpected reply when asking for an upload slot" }, 502);

    // 2) Upload the photo bytes to the address they gave us
    const up = await fetch(slot.url, { method: slot.method, headers: { "Content-Type": v.mime, ...slot.headers }, body: bytes, signal: AbortSignal.timeout(25000) });
    if (!up.ok) return json({ error: "perfect_error", detail: `Photo upload failed (HTTP ${up.status})` }, 502);

    // 3) Start the lipstick task
    const task = await call("/s2s/v2.0/task/makeup-vto", key, { method: "POST", body: JSON.stringify(buildTaskBody(slot.fileId, v)) });
    if (!task.res.ok) return upstreamError(task.res, task.body);
    const taskId = task.body?.data?.task_id;
    if (!validTaskId(taskId)) return json({ error: "perfect_error", detail: "No task id returned" }, 502);
    return json({ taskId });
  } catch (e) {
    if (e.message === "bad_request") return json({ error: "bad_request" }, 400);
    return json({ error: "upstream_unreachable" }, 502);
  }
};

export const config = { path: "/api/perfect-tryon" };
