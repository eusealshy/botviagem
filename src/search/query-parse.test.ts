import assert from "node:assert/strict";
import test from "node:test";
import {
  parseFlightQuery,
  shouldHandleInbound,
  type ParseOk,
} from "./query-parse.ts";

const TODAY = "2026-10-07";

function parse(text: string, isGroup = true) {
  return parseFlightQuery(text, { today: TODAY, isGroup });
}

function ok(text: string, isGroup = true): ParseOk {
  const result = parse(text, isGroup);
  assert.equal(result.status, "ok");
  return result as ParseOk;
}

test("grupo sem 'bot' no começo é ignorado mesmo se parecer pedido de voo", () => {
  assert.equal(shouldHandleInbound("qual voo mais barato saindo de natal pra sao paulo no dia 11/11", true), false);
  assert.equal(parse("qual voo mais barato saindo de natal pra sao paulo no dia 11/11", true).status, "ignore");
});

test("grupo que começa com bot é comando", () => {
  assert.equal(shouldHandleInbound("bot, qual voo mais barato saindo de natal", true), true);
  assert.equal(shouldHandleInbound("Bot qual voo mais barato", true), true);
});

test("PV aceita pedido de voo sem prefixo bot", () => {
  assert.equal(shouldHandleInbound("qual voo mais barato saindo de natal pra recife no dia 11/11", false), true);
  assert.equal(shouldHandleInbound("oi", false), false);
});

test("dia específico DD/MM no exemplo da Carla", () => {
  const result = ok(
    "bot, qual voo mais barato saindo de natal pra sao paulo no dia 11/11",
    true,
  );
  assert.equal(result.origin.city, "Natal");
  assert.equal(result.origin.primary, "NAT");
  assert.equal(result.dest.city, "São Paulo");
  assert.deepEqual(result.dest.codes, ["GRU", "CGH"]);
  assert.equal(result.window.kind, "day");
  assert.equal(result.window.start, "2026-11-11");
  assert.equal(result.window.end, "2026-11-11");
});

test("dia só com número usa o mês atual se ainda não passou", () => {
  const result = ok("bot de recife pra salvador dia 11", true);
  assert.equal(result.window.kind, "day");
  assert.equal(result.window.start, "2026-10-11");
});

test("dia já passado neste mês cai no mês seguinte", () => {
  const result = ok("bot de recife pra salvador dia 3", true);
  assert.equal(result.window.start, "2026-11-03");
});

test("essa semana é a semana civil atual (seg a dom)", () => {
  const result = ok("bot mais barato de recife pra salvador essa semana", true);
  assert.equal(result.window.kind, "week");
  assert.equal(result.window.start, "2026-10-05");
  assert.equal(result.window.end, "2026-10-11");
});

test("semana que vem é a próxima seg a dom", () => {
  const result = ok("bot voo de natal pra sao paulo semana que vem", true);
  assert.equal(result.window.kind, "week");
  assert.equal(result.window.start, "2026-10-12");
  assert.equal(result.window.end, "2026-10-18");
});

test("intervalo de 7 dias conta como semana", () => {
  const result = ok("bot de maceio pra fortaleza de 10/11 a 16/11", true);
  assert.equal(result.window.kind, "week");
  assert.equal(result.window.start, "2026-11-10");
  assert.equal(result.window.end, "2026-11-16");
});

test("intervalo maior que 7 dias pede para estreitar", () => {
  const result = parse("bot de maceio pra fortaleza de 10/11 a 20/11", true);
  assert.equal(result.status, "clarify");
  if (result.status === "clarify") assert.equal(result.reason, "tooWide");
});

test("semana do dia 10/11 vira 7 dias a partir dessa data", () => {
  const result = ok("bot de curitiba pra floripa semana do dia 10/11", true);
  assert.equal(result.window.kind, "week");
  assert.equal(result.window.start, "2026-11-10");
  assert.equal(result.window.end, "2026-11-16");
});

test("aeroporto específico pina a origem num código", () => {
  const result = ok("bot saindo de cgh pra recife no dia 15/11", true);
  assert.deepEqual(result.origin.codes, ["CGH"]);
  assert.equal(result.dest.primary, "REC");
});

test("falta destino pede esclarecimento", () => {
  const result = parse("bot saindo de natal no dia 11/11", true);
  assert.equal(result.status, "clarify");
  if (result.status === "clarify") {
    assert.equal(result.reason, "missing");
    assert.deepEqual(result.missing, ["dest"]);
  }
});

test("falta dia ou semana pede esclarecimento", () => {
  const result = parse("bot voo mais barato de natal pra sao paulo", true);
  assert.equal(result.status, "clarify");
  if (result.status === "clarify") {
    assert.ok(result.missing.includes("when"));
  }
});
