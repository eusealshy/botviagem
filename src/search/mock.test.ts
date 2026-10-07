import assert from "node:assert/strict";
import test from "node:test";
import { MockSearchAdapter } from "./mock.ts";

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
