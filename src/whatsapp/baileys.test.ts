import assert from "node:assert/strict";
import test from "node:test";
import { Boom } from "@hapi/boom";
import { formatBaileysLog } from "./baileys.ts";

test("erro do Baileys mostra a mensagem e a stack, não [object Object]", () => {
  const err = new Boom("Connection Failure", { statusCode: 401 });
  const line = formatBaileysLog([{ err }, "error in validating connection"]);

  assert.ok(line);
  assert.match(line, /error in validating connection/);
  assert.match(line, /Connection Failure/);
  assert.ok(err.stack);
  assert.ok(line.includes(err.stack));
  assert.equal(line.includes("[object Object]"), false);
});

test("campo error e trace também entram no log", () => {
  const err = new Error("invalid utf8");
  const handled = formatBaileysLog([{ error: err }, "error in handling message"]);
  assert.ok(handled);
  assert.match(handled, /error in handling message/);
  assert.match(handled, /invalid utf8/);
  assert.ok(err.stack);
  assert.ok(handled.includes(err.stack));

  const upload = new Error("upload failed, reason: 403");
  const retried = formatBaileysLog([
    { trace: upload.stack, uploadResult: { status: 403 } },
    "Error in uploading to media.example.com , retrying...",
  ]);
  assert.ok(retried);
  assert.match(retried, /Error in uploading to media\.example\.com/);
  assert.ok(upload.stack);
  assert.ok(retried.includes(upload.stack));
  assert.equal(retried.includes("[object Object]"), false);
});

test("sem stack ainda mostra a mensagem do erro", () => {
  const line = formatBaileysLog([
    { err: { message: "Connection Terminated" } },
    "error in validating connection",
  ]);
  assert.equal(line, "error in validating connection\nConnection Terminated");
});

test("mensagem string do Baileys permanece igual", () => {
  assert.equal(
    formatBaileysLog(["failed to commit 3 mutations, tries left=2"]),
    "failed to commit 3 mutations, tries left=2",
  );
  assert.equal(formatBaileysLog([{ node: { tag: "stream:error" } }, "stream errored out"]), "stream errored out");
  assert.equal(formatBaileysLog([undefined]), undefined);
  assert.equal(formatBaileysLog([""]), undefined);
});
