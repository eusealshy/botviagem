import assert from "node:assert/strict";
import test from "node:test";
import { formatBaileysLog } from "./format-log.ts";

test("mensagem string do Baileys permanece igual", () => {
  const err = new Error("connection reset");
  assert.equal(
    formatBaileysLog(["keep alive called when WS not open", err]),
    "keep alive called when WS not open",
  );
  assert.equal(formatBaileysLog([""]), undefined);
  assert.equal(formatBaileysLog([]), undefined);
});

test("logger.error({ err }, msg) mostra a mensagem e o stack", () => {
  const err = new Error("connection reset");
  const text = formatBaileysLog([{ err }, "unexpected error in 'connection.update'"]);
  assert.ok(text);
  assert.match(text, /unexpected error in 'connection.update'/);
  assert.match(text, /connection reset/);
  assert.match(text, /\n\s+at /);
  assert.equal(text.includes("[object Object]"), false);
});

test("trace e erro simples entram no log sem virar [object Object]", () => {
  const err = new Error("timeout");
  const withTrace = formatBaileysLog([{ trace: err.stack }, "error in sending keep alive"]);
  assert.ok(withTrace);
  assert.match(withTrace, /error in sending keep alive/);
  assert.match(withTrace, /timeout/);
  assert.match(withTrace, /\n\s+at /);
  assert.equal(withTrace.includes("[object Object]"), false);

  const plain = formatBaileysLog([
    {
      error: {
        message: "bad mac",
        stack: "Error: bad mac\n    at decrypt (node_modules/@whiskeysockets/baileys/lib/Utils/decode-wa-message.js:191:15)",
      },
    },
    "failed to decrypt message",
  ]);
  assert.ok(plain);
  assert.match(plain, /failed to decrypt message/);
  assert.match(plain, /bad mac/);
  assert.match(plain, /decode-wa-message/);
  assert.equal(plain.includes("[object Object]"), false);
});
