import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureDeepLink,
  formatAdminNotice,
  googleFlightsDeepLink,
  resolveDeepLink,
} from "./deeplink.ts";
import type { FlightOffer } from "./types.ts";

function offer(extra: Partial<FlightOffer> = {}): FlightOffer {
  return {
    id: "abc",
    fingerprint: "fp",
    origin: { code: "CGH", city: "São Paulo" },
    destination: { code: "CWB", city: "Curitiba" },
    departDate: "2026-11-11",
    returnDate: "2026-11-16",
    priceBRL: 219,
    airline: "Azul",
    stops: 0,
    outboundTimes: undefined,
    returnTimes: undefined,
    source: "mock",
    foundAt: "2026-10-07T12:00:00.000Z",
    deepLink: undefined,
    promoScore: 0.4,
    ...extra,
  };
}

test("monta URL do Google Flights com origem, destino e datas", () => {
  const url = googleFlightsDeepLink({
    originCode: "cgh",
    destinationCode: "cwb",
    departDate: "2026-11-11",
    returnDate: "2026-11-16",
  });
  const parsed = new URL(url);
  assert.equal(parsed.origin, "https://www.google.com");
  assert.equal(parsed.pathname, "/travel/flights");
  assert.equal(parsed.searchParams.get("hl"), "pt-BR");
  assert.equal(parsed.searchParams.get("curr"), "BRL");
  const q = parsed.searchParams.get("q") ?? "";
  assert.match(q, /CGH/);
  assert.match(q, /CWB/);
  assert.match(q, /2026-11-11/);
  assert.match(q, /2026-11-16/);
});

test("resolveDeepLink preenche quando falta ou é só a home do Google Flights", () => {
  const built = googleFlightsDeepLink({
    originCode: "CGH",
    destinationCode: "CWB",
    departDate: "2026-11-11",
    returnDate: "2026-11-16",
  });
  const base = {
    originCode: "CGH",
    destinationCode: "CWB",
    departDate: "2026-11-11",
    returnDate: "2026-11-16",
  };
  assert.equal(resolveDeepLink({ ...base, deepLink: undefined }), built);
  assert.equal(resolveDeepLink({ ...base, deepLink: "https://www.google.com/travel/flights" }), built);
  assert.equal(resolveDeepLink({ ...base, deepLink: "" }), built);
});

test("resolveDeepLink conserva um link de busca já específico", () => {
  const existing =
    "https://www.google.com/travel/flights?hl=pt-BR&curr=BRL&q=Voos%20de%20GRU%20para%20REC%202026-11-12%202026-11-18";
  const url = resolveDeepLink({
    originCode: "GRU",
    destinationCode: "REC",
    departDate: "2026-11-12",
    returnDate: "2026-11-18",
    deepLink: existing,
  });
  assert.equal(url, existing);
});

test("ensureDeepLink grava o link na oferta sem mudar o restante", () => {
  const filled = ensureDeepLink(offer({ deepLink: undefined }));
  assert.match(filled.deepLink ?? "", /travel\/flights/);
  assert.equal(filled.origin.code, "CGH");
  assert.equal(filled.priceBRL, 219);
});

test("aviso da admin tem resumo curto e o deep link, sem o template do grupo", () => {
  const text = formatAdminNotice(offer());
  assert.match(text, /Postei no grupo/);
  assert.match(text, /Curitiba · R\$ 219/);
  assert.match(text, /CGH ⇄ Curitiba/);
  assert.match(text, /11 → 16\/11/);
  assert.match(text, /https:\/\/www\.google\.com\/travel\/flights/);
  assert.match(text, /2026-11-11/);
  assert.doesNotMatch(text, /Quer fechar/);
  assert.doesNotMatch(text, /QUERO /);
});
