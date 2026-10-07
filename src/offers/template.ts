import { copy, ctaDestination } from "../copy/strings.ts";
import { formatPtDate } from "../lib/clock.ts";
import type { FlightOffer } from "./types.ts";

const EMOJIS = ["✈️", "🌴", "🧳"] as const;

export function formatOfferMessage(offer: FlightOffer, brandName: string): string {
  const dest = ctaDestination(offer.destination.city);
  const price = formatBRL(offer.priceBRL);
  const dates = `${formatPtDate(offer.departDate)} a ${formatPtDate(offer.returnDate)}`;
  const route = `${offer.origin.code} ⇄ ${offer.destination.city}`;
  const stopLine = offer.stops === 0 ? "voo direto" : `${offer.stops} parada(s)`;
  const airline = offer.airline ? ` · ${offer.airline}` : "";
  const emoji = EMOJIS[hashMod(offer.id, EMOJIS.length)] ?? "✈️";
  const variant = hashMod(offer.id, 3);

  const body =
    variant === 0
      ? [
          `${emoji} ${offer.destination.city} saindo de ${offer.origin.city}`,
          route,
          `ida e volta · ${dates}`,
          price,
          `${stopLine}${airline}`,
        ]
      : variant === 1
        ? [
            `${emoji} ${price} · ${offer.destination.city}`,
            `${route}, ida e volta ${dates}`,
            `${stopLine}${airline}`,
          ]
        : [
            `${emoji} achado: ${route}`,
            `ida e volta ${dates}`,
            price,
            `${stopLine}${airline}`,
          ];

  return [
    ...body,
    "",
    `QUERO ${dest}`,
    "",
    copy.disclaimer,
    brandName,
  ].join("\n");
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function hashMod(value: string, mod: number): number {
  let acc = 0;
  for (const char of value) acc = (acc + char.charCodeAt(0)) % 997;
  return acc % mod;
}
