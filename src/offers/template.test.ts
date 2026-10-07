import assert from "node:assert/strict";
import test from "node:test";
import { destinationEmoji, formatBRL, formatOfferMessage } from "./template.ts";
import type { FlightOffer } from "./types.ts";

function offer(extra: Partial<FlightOffer> = {}): FlightOffer {
  return {
    id: "abc123",
    fingerprint: "fp",
    origin: { code: "CGH", city: "São Paulo" },
    destination: { code: "CWB", city: "Curitiba" },
    departDate: "2026-11-11",
    returnDate: "2026-11-16",
    priceBRL: 219,
    airline: "Azul",
    stops: 0,
    outboundTimes: { depart: "08:20", arrive: "09:25" },
    returnTimes: { depart: "18:40", arrive: "19:45" },
    source: "mock",
    foundAt: "2026-10-07T12:00:00.000Z",
    deepLink: undefined,
    promoScore: 0.4,
    ...extra,
  };
}

test("mensagem segue o padrão da Carla com campos reais da oferta", () => {
  const text = formatOfferMessage(offer());
  assert.equal(
    text,
    [
      "🌴 CURITIBA | R$ 219",
      "",
      "📅 11 → 16/11",
      "✈️ CGH ⇄ Curitiba",
      "⚡ Direto",
      "🕐 08:20 → 09:25",
      "🕐 18:40 → 19:45",
      "",
      "💬 Quer fechar? Me chama no PV.",
      "",
      "Valor sujeito a alteração até a emissão. Bagagem e assento conforme tarifa.",
    ].join("\n"),
  );
});

test("sem horários omite as linhas de relógio e não inventa", () => {
  const text = formatOfferMessage(
    offer({ outboundTimes: undefined, returnTimes: undefined }),
  );
  assert.equal(
    text,
    [
      "🌴 CURITIBA | R$ 219",
      "",
      "📅 11 → 16/11",
      "✈️ CGH ⇄ Curitiba",
      "⚡ Direto",
      "",
      "💬 Quer fechar? Me chama no PV.",
      "",
      "Valor sujeito a alteração até a emissão. Bagagem e assento conforme tarifa.",
    ].join("\n"),
  );
  assert.doesNotMatch(text, /🕐/);
});

test("mostra só o trecho que tem horário", () => {
  const text = formatOfferMessage(offer({ returnTimes: undefined }));
  assert.match(text, /🕐 08:20 → 09:25/);
  assert.doesNotMatch(text, /18:40/);
});

test("horário incompleto não vira linha", () => {
  const text = formatOfferMessage(
    offer({
      outboundTimes: { depart: "08:20", arrive: "" },
      returnTimes: undefined,
    }),
  );
  assert.doesNotMatch(text, /🕐/);
});

test("datas de meses diferentes usam dia/mês nos dois lados", () => {
  const text = formatOfferMessage(
    offer({
      departDate: "2026-11-28",
      returnDate: "2026-12-03",
      outboundTimes: undefined,
      returnTimes: undefined,
    }),
  );
  assert.match(text, /📅 28\/11 → 03\/12/);
});

test("1 parada e N paradas", () => {
  assert.match(formatOfferMessage(offer({ stops: 1, outboundTimes: undefined, returnTimes: undefined })), /⚡ 1 parada/);
  assert.match(formatOfferMessage(offer({ stops: 2, outboundTimes: undefined, returnTimes: undefined })), /⚡ 2 paradas/);
});

test("preço em formato BR e destino em caixa alta", () => {
  const text = formatOfferMessage(
    offer({
      destination: { code: "REC", city: "Recife" },
      priceBRL: 1234,
      outboundTimes: undefined,
      returnTimes: undefined,
    }),
  );
  assert.match(text, /🌴 RECIFE \| R\$ 1\.234/);
  assert.equal(formatBRL(219), "R$ 219");
  assert.equal(formatBRL(1234), "R$ 1.234");
});

test("cidade pouco comum cai no avião; Recife e Curitiba têm emoji próprio", () => {
  assert.equal(destinationEmoji("Curitiba"), "🌴");
  assert.equal(destinationEmoji("Recife"), "🌴");
  assert.equal(destinationEmoji("Vitória"), "✈️");
});

test("não usa o template antigo (QUERO, rodapé da marca, ida e volta)", () => {
  const text = formatOfferMessage(offer({ outboundTimes: undefined, returnTimes: undefined }));
  assert.doesNotMatch(text, /QUERO /);
  assert.doesNotMatch(text, /Agência/);
  assert.doesNotMatch(text, /ida e volta/i);
  assert.doesNotMatch(text, /—/);
});
