import { test } from "node:test";
import assert from "node:assert/strict";
import { validateStart, buildTaskBody, parseFileReply, validTaskId, parseStatus } from "../netlify/lib/perfect-helpers.mjs";

const b64 = "A".repeat(200);

test("validateStart accepts a good request and rejects bad ones", () => {
  const v = validateStart({ imageBase64: b64, mime: "image/jpeg", color: "#e0948c", opacity: 5, gloss: -2 });
  assert.equal(v.color, "#E0948C");
  assert.equal(v.opacity, 1);
  assert.equal(v.gloss, 0);
  for (const bad of [
    { imageBase64: b64, mime: "image/gif", color: "#E0948C" },
    { imageBase64: "not base64!!", mime: "image/jpeg", color: "#E0948C" },
    { imageBase64: b64, mime: "image/jpeg", color: "red" },
    { imageBase64: "A".repeat(7_000_000), mime: "image/jpeg", color: "#E0948C" },
    null,
  ]) assert.throws(() => validateStart(bad), /bad_request/);
});

test("task body uses the lip_color effect with mapped settings", () => {
  const body = buildTaskBody("file123", { color: "#A94A33", opacity: 0.75, gloss: 0.45 });
  assert.equal(body.src_file_id, "file123");
  assert.equal(body.effects[0].category, "lip_color");
  assert.deepEqual(body.effects[0].palettes[0], { color: "#A94A33", texture: "gloss", colorIntensity: 75, gloss: 45 });
  assert.equal(buildTaskBody("f", { color: "#A94A33", opacity: 0.5, gloss: 0.1 }).effects[0].palettes[0].texture, "matte");
});

test("file reply is parsed in either known shape and unsafe urls are refused", () => {
  const a = parseFileReply({ data: { files: [{ file_id: "abc", requests: [{ url: "https://s3.example/up", method: "put", headers: { "Content-Length": "5", "x-amz": "y" } }] }] } });
  assert.deepEqual(a, { fileId: "abc", url: "https://s3.example/up", method: "PUT", headers: { "x-amz": "y" } });
  assert.equal(parseFileReply({ data: { file_id: "z", url: "https://s3.example/u" } }).fileId, "z");
  assert.equal(parseFileReply({ data: { files: [{ file_id: "abc", requests: [{ url: "http://insecure/up" }] }] } }), null);
  assert.equal(parseFileReply({}), null);
});

test("task ids and status replies are checked", () => {
  assert.ok(validTaskId("grH0CvsgXuAIHLUzD0V1Ol34hoet3R1tvdbtiVHrDb6_UqCLKIejAIajwxrhOAfe"));
  for (const bad of ["../../etc", "a b c d e f g h", "", "short", null]) assert.ok(!validTaskId(bad), String(bad));
  assert.deepEqual(parseStatus({ data: { task_status: "success", results: { url: "https://s3.example/r.jpg" } } }), { status: "success", url: "https://s3.example/r.jpg" });
  assert.equal(parseStatus({ data: { task_status: "running" } }).status, "running");
  assert.equal(parseStatus({ data: { task_status: "success", results: { url: "javascript:alert(1)" } } }).status, "running");
  assert.equal(parseStatus({ data: { task_status: "error", error: "exceed_max_filesize" } }).status, "error");
});
