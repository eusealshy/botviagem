import assert from "node:assert/strict";
import test from "node:test";
import { formatOfferMessage } from "./template.ts";
import type { FlightOffer } from "./types.ts";

const offer: FlightOffer = {
  id: "abc123",
  fingerprint: "fp",
  origin: { code: "GRU", city: "São Paulo" },
  destination: { code: "REC", city: "Recife" },
  departDate: "2026-11-12",
  returnDate: "2026-11-18",
  priceBRL: 389,
  airline: "Azul",
  stops: 0,
  source: "mock",
  foundAt: "2026-10-07T12:00:00.000Z",
  deepLink: undefined,
  promoScore: 0.4,
};

test("mensagem de grupo tem os campos combinados com a agência", () => {
  const text = formatOfferMessage(offer, "Agência Exemplo");
  assert.match(text, /✈️|🌴|🧳/);
  assert.match(text, /R\$\s*389/);
  assert.match(text, /12\/11 a 18\/11/);
  assert.match(text, /ida e volta/i);
  assert.match(text, /QUERO RECIFE/);
  assert.match(text, /Agência Exemplo/);
  assert.match(text, /preço pode mudar/);
  assert.doesNotMatch(text, /—/);
});
