import { formatOfferDateRange } from "../lib/clock.ts";
import { formatBRL } from "./template.ts";
import type { FlightOffer } from "./types.ts";

export type FlightLinkInput = {
  originCode: string;
  destinationCode: string;
  departDate: string;
  returnDate: string;
  deepLink: string | undefined;
};

export function googleFlightsDeepLink(input: {
  originCode: string;
  destinationCode: string;
  departDate: string;
  returnDate: string;
}): string {
  const origin = input.originCode.trim().toUpperCase();
  const dest = input.destinationCode.trim().toUpperCase();
  const q = `Voos de ${origin} para ${dest} ${input.departDate} ${input.returnDate}`;
  return `https://www.google.com/travel/flights?hl=pt-BR&gl=BR&curr=BRL&q=${encodeURIComponent(q)}`;
}

export function resolveDeepLink(input: FlightLinkInput): string {
  if (hasUsableDeepLink(input.deepLink)) return input.deepLink;
  return googleFlightsDeepLink(input);
}

export function ensureDeepLink<T extends FlightOffer>(offer: T): T {
  return {
    ...offer,
    deepLink: resolveDeepLink({
      originCode: offer.origin.code,
      destinationCode: offer.destination.code,
      departDate: offer.departDate,
      returnDate: offer.returnDate,
      deepLink: offer.deepLink,
    }),
  };
}

export function formatAdminNotice(offer: FlightOffer): string {
  const linked = ensureDeepLink(offer);
  const summary = [
    `${linked.destination.city} · ${formatBRL(linked.priceBRL)} · ${linked.origin.code} ⇄ ${linked.destination.city} · ${formatOfferDateRange(linked.departDate, linked.returnDate)}`,
  ].join("\n");
  return `Postei no grupo.\n${summary}\n\n${linked.deepLink}`;
}

function hasUsableDeepLink(url: string | undefined): url is string {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("google.")) return true;
    const query = parsed.searchParams.get("q")?.trim() ?? "";
    return Boolean(query || parsed.searchParams.has("tfs") || parsed.hash.includes("flt="));
  } catch {
    return false;
  }
}
