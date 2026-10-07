import assert from "node:assert/strict";
import test from "node:test";
import { isPromoWorthy, scoreFare } from "./rank.ts";
import type { RawFare } from "./types.ts";

function fare(city: string, priceBRL: number, extra: Partial<RawFare> = {}): RawFare {
  return {
    originCode: "GRU",
    originCity: "São Paulo",
    destinationCode: city.slice(0, 3).toUpperCase(),
    destinationCity: city,
    departDate: "2026-11-10",
    returnDate: "2026-11-17",
    priceBRL,
    airline: undefined,
    stops: 0,
    deepLink: undefined,
    ...extra,
  };
}

test("tarifa bem abaixo do lote ganha score de promo", () => {
  const batch = [fare("Recife", 329), fare("Fortaleza", 890), fare("Natal", 910)];
  const cheap = batch[0];
  assert.ok(cheap);
  const score = scoreFare(cheap, batch);
  assert.ok(score > 0.2);
  assert.equal(isPromoWorthy(score), true);
});

test("preço no meio do lote não passa no corte", () => {
  const batch = [fare("Recife", 780), fare("Fortaleza", 800), fare("Natal", 820)];
  const mid = batch[1];
  assert.ok(mid);
  assert.equal(isPromoWorthy(scoreFare(mid, batch)), false);
});
