import assert from "node:assert/strict";
import test from "node:test";
import { MockSearchAdapter } from "./mock.ts";

test("mock com destino e data devolve aquele trecho na janela", async () => {
  const adapter = new MockSearchAdapter("America/Sao_Paulo");
  const fares = await adapter.search({
    originCode: "NAT",
    originCity: "Natal",
    currency: "BRL",
    destinationCode: "GRU",
    destinationCity: "São Paulo",
    departFrom: "2026-11-11",
    departTo: "2026-11-11",
  });
  assert.equal(fares.length, 1);
  const row = fares[0];
  assert.ok(row);
  assert.equal(row.originCode, "NAT");
  assert.equal(row.destinationCode, "GRU");
  assert.equal(row.destinationCity, "São Paulo");
  assert.equal(row.departDate, "2026-11-11");
  assert.equal(row.returnDate, "2026-11-16");
});

test("mock devolve ida e volta a partir da origem pedida", async () => {
  const adapter = new MockSearchAdapter("America/Sao_Paulo");
  const fares = await adapter.search({
    originCode: "GRU",
    originCity: "São Paulo",
    currency: "BRL",
  });
  assert.ok(fares.length >= 3);
  for (const fare of fares) {
    assert.equal(fare.originCode, "GRU");
    assert.notEqual(fare.destinationCode, "GRU");
    assert.ok(fare.priceBRL > 0);
    assert.match(fare.departDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(fare.returnDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(fare.returnDate > fare.departDate);
  }
});
