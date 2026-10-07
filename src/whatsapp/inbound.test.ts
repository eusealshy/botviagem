import assert from "node:assert/strict";
import test from "node:test";
import type { RawFare } from "../offers/types.ts";
import type { FlightSearchAdapter, SearchQuery } from "../search/adapter.ts";
import { InboundSearch } from "./inbound.ts";
import type { IncomingChat } from "./gateway.ts";

const NOW = new Date("2026-10-07T15:00:00.000Z");
const GROUP = "120363testebot@g.us";
const DM = "5511999999999@s.whatsapp.net";

function fare(extra: Partial<RawFare> = {}): RawFare {
  return {
    originCode: "NAT",
    originCity: "Natal",
    destinationCode: "GRU",
    destinationCity: "São Paulo",
    departDate: "2026-11-11",
    returnDate: "2026-11-16",
    priceBRL: 389,
    airline: "Gol",
    stops: 0,
    outboundTimes: { depart: "08:20", arrive: "11:10" },
    returnTimes: { depart: "18:40", arrive: "21:05" },
    deepLink: undefined,
    ...extra,
  };
}

class FakeSearch implements FlightSearchAdapter {
  readonly source = "mock" as const;
  constructor(private readonly fares: RawFare[]) {}
  async search(query: SearchQuery): Promise<RawFare[]> {
    return this.fares.filter((item) => item.originCode === query.originCode);
  }
}

function chat(extra: Partial<IncomingChat>): IncomingChat {
  return {
    id: extra.id ?? "m1",
    jid: extra.jid ?? GROUP,
    isGroup: extra.isGroup ?? true,
    text: extra.text ?? "",
    fromMe: extra.fromMe ?? false,
  };
}

test("grupo testebot sem prefixo bot não responde", async () => {
  const inbound = new InboundSearch(new FakeSearch([fare()]), "America/Sao_Paulo");
  const result = await inbound.handle(
    chat({
      text: "qual voo mais barato saindo de natal pra sao paulo no dia 11/11",
      jid: GROUP,
      isGroup: true,
    }),
    NOW,
  );
  assert.equal(result.action, "ignore");
});

test("grupo que começa com bot responde no mesmo JID com o template da Carla", async () => {
  const inbound = new InboundSearch(new FakeSearch([fare()]), "America/Sao_Paulo");
  const result = await inbound.handle(
    chat({
      text: "bot, qual voo mais barato saindo de natal pra sao paulo no dia 11/11",
      jid: GROUP,
      isGroup: true,
    }),
    NOW,
  );
  assert.equal(result.action, "reply");
  if (result.action !== "reply") return;
  assert.equal(result.jid, GROUP);
  assert.match(result.text, /🏙️ SÃO PAULO \| R\$ 389/);
  assert.match(result.text, /📅 11 → 16\/11/);
  assert.match(result.text, /✈️ NAT ⇄ São Paulo/);
  assert.match(result.text, /⚡ Direto/);
  assert.match(result.text, /🕐 08:20 → 11:10/);
  assert.match(result.text, /💬 Quer fechar\? Me chama no PV\./);
  assert.doesNotMatch(result.text, /QUERO /);
});

test("PV sem bot ainda responde pedido de voo", async () => {
  const inbound = new InboundSearch(new FakeSearch([fare()]), "America/Sao_Paulo");
  const result = await inbound.handle(
    chat({
      id: "dm1",
      jid: DM,
      isGroup: false,
      text: "qual voo mais barato saindo de natal pra sao paulo no dia 11/11",
    }),
    NOW,
  );
  assert.equal(result.action, "reply");
  if (result.action !== "reply") return;
  assert.equal(result.jid, DM);
  assert.match(result.text, /SÃO PAULO/);
});

test("escolhe a tarifa mais barata no trecho", async () => {
  const inbound = new InboundSearch(
    new FakeSearch([
      fare({ originCode: "NAT", priceBRL: 520, destinationCode: "CGH" }),
      fare({ originCode: "NAT", priceBRL: 310, destinationCode: "GRU" }),
    ]),
    "America/Sao_Paulo",
  );
  const result = await inbound.handle(
    chat({
      id: "cheap",
      text: "bot natal pra sao paulo dia 11/11",
    }),
    NOW,
  );
  assert.equal(result.action, "reply");
  if (result.action !== "reply") return;
  assert.match(result.text, /R\$ 310/);
});

test("sem tarifa responde curto", async () => {
  const inbound = new InboundSearch(new FakeSearch([]), "America/Sao_Paulo");
  const result = await inbound.handle(
    chat({
      id: "empty",
      text: "bot natal pra recife dia 11/11",
    }),
    NOW,
  );
  assert.equal(result.action, "reply");
  if (result.action !== "reply") return;
  assert.equal(result.text, "Não achei passagem nesse trecho nessa data.");
});

test("ambíguo faz uma pergunta curta", async () => {
  const inbound = new InboundSearch(new FakeSearch([]), "America/Sao_Paulo");
  const result = await inbound.handle(
    chat({
      id: "ask",
      text: "bot natal pra sao paulo",
    }),
    NOW,
  );
  assert.equal(result.action, "reply");
  if (result.action !== "reply") return;
  assert.equal(result.text, "Qual o dia (DD/MM) ou a semana?");
});
