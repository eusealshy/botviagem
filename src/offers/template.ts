import { copy } from "../copy/strings.ts";
import { formatOfferDateRange } from "../lib/clock.ts";
import type { FlightOffer, LegTimes } from "./types.ts";

const DEFAULT_DESTINATION_EMOJI = "✈️";

/** Small map for common Brazilian (and nearby) destinations. Unknown cities use ✈️. */
const DESTINATION_EMOJI: Record<string, string> = {
  curitiba: "🌴",
  recife: "🌴",
  salvador: "🌴",
  fortaleza: "🌴",
  natal: "🌴",
  maceio: "🌴",
  "joao pessoa": "🌴",
  "porto seguro": "🌴",
  "fernando de noronha": "🌴",
  "porto de galinhas": "🌴",
  "florianopolis": "🏖️",
  "rio de janeiro": "🏖️",
  buzios: "🏖️",
  "cabo frio": "🏖️",
  "foz do iguacu": "💧",
  gramado: "🌲",
  canela: "🌲",
  manaus: "🌳",
  belem: "🌳",
  "porto alegre": "🧉",
  brasilia: "🏛️",
  "sao paulo": "🏙️",
  "belo horizonte": "⛰️",
  "buenos aires": "💃",
  lisboa: "🏰",
  miami: "🌴",
  santiago: "⛰️",
};

export function formatOfferMessage(offer: FlightOffer): string {
  const lines = [
    `${destinationEmoji(offer.destination.city)} ${offer.destination.city.toUpperCase()} | ${formatBRL(offer.priceBRL)}`,
    "",
    `📅 ${formatOfferDateRange(offer.departDate, offer.returnDate)}`,
    `✈️ ${offer.origin.code} ⇄ ${offer.destination.city}`,
    formatStops(offer.stops),
  ];

  const outbound = formatTimeLine(offer.outboundTimes);
  const inbound = formatTimeLine(offer.returnTimes);
  if (outbound) lines.push(outbound);
  if (inbound) lines.push(inbound);

  lines.push("", copy.cta, "", copy.disclaimer);
  return lines.join("\n");
}

export function formatBRL(value: number): string {
  const formatted = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
  return `R$ ${formatted}`;
}

export function destinationEmoji(city: string): string {
  return DESTINATION_EMOJI[foldCity(city)] ?? DEFAULT_DESTINATION_EMOJI;
}

function formatStops(stops: number): string {
  if (stops === 0) return "⚡ Direto";
  if (stops === 1) return "⚡ 1 parada";
  return `⚡ ${stops} paradas`;
}

function formatTimeLine(times: LegTimes | undefined): string | undefined {
  const depart = times?.depart.trim();
  const arrive = times?.arrive.trim();
  if (!depart || !arrive) return undefined;
  return `🕐 ${depart} → ${arrive}`;
}

function foldCity(city: string): string {
  return city
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
