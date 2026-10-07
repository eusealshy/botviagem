import assert from "node:assert/strict";
import test from "node:test";
import { fareFingerprint } from "./fingerprint.ts";

test("mesmo trecho com preço vizinho vira a mesma digital", () => {
  const a = fareFingerprint({
    originCode: "GRU",
    destinationCode: "REC",
    departDate: "2026-11-12",
    returnDate: "2026-11-18",
    priceBRL: 389,
  });
  const b = fareFingerprint({
    originCode: "gru",
    destinationCode: "rec",
    departDate: "2026-11-12",
    returnDate: "2026-11-18",
    priceBRL: 401,
  });
  assert.equal(a, b);
});

test("destino diferente muda a digital", () => {
  const a = fareFingerprint({
    originCode: "GRU",
    destinationCode: "REC",
    departDate: "2026-11-12",
    returnDate: "2026-11-18",
    priceBRL: 389,
  });
  const b = fareFingerprint({
    originCode: "GRU",
    destinationCode: "FOR",
    departDate: "2026-11-12",
    returnDate: "2026-11-18",
    priceBRL: 389,
  });
  assert.notEqual(a, b);
});
