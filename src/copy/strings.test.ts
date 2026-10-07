import assert from "node:assert/strict";
import test from "node:test";
import { copy } from "./strings.ts";

function walk(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [String(value("x"))];
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(walk);
  }
  return [];
}

test("CTA e disclaimer da oferta seguem o texto da Carla", () => {
  assert.equal(copy.cta, "💬 Quer fechar? Me chama no PV.");
  assert.equal(
    copy.disclaimer,
    "Valor sujeito a alteração até a emissão. Bagagem e assento conforme tarifa.",
  );
});

test("copy não carrega os hábitos de texto de modelo listados no humanizer", () => {
  const texts = walk(copy).join("\n").toLowerCase();
  const banned = [
    "—",
    "não é só",
    "não é apenas",
    "vamos lá",
    "aqui está o que",
    "na essência",
    "o verdadeiro",
    "let that sink",
    "robust",
    "pivotal",
    "delve",
  ];
  for (const item of banned) {
    assert.equal(texts.includes(item), false, item);
  }
});
