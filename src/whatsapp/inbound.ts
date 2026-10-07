import { copy } from "../copy/strings.ts";
import { dayKey } from "../lib/clock.ts";
import { foldPt } from "../lib/fold.ts";
import { fareFingerprint, offerId } from "../offers/fingerprint.ts";
import { formatOfferMessage } from "../offers/template.ts";
import type { FlightOffer, RawFare } from "../offers/types.ts";
import type { FlightSearchAdapter, SearchQuery } from "../search/adapter.ts";
import type { DateWindow, ParseClarify } from "../search/query-parse.ts";
import { parseFlightQuery } from "../search/query-parse.ts";
import type { ParsedPlace } from "../search/places.ts";
import { log } from "../lib/log.ts";
import type { IncomingChat } from "./gateway.ts";

export type InboundResult =
  | { action: "ignore" }
  | { action: "reply"; jid: string; text: string };

export class InboundSearch {
  private readonly seen = new Set<string>();

  constructor(
    private readonly search: FlightSearchAdapter,
    private readonly timezone: string,
  ) {}

  async handle(msg: IncomingChat, now = new Date()): Promise<InboundResult> {
    if (msg.fromMe) return { action: "ignore" };
    if (!msg.jid || msg.jid === "status@broadcast") return { action: "ignore" };
    if (this.seen.has(msg.id)) return { action: "ignore" };
    this.seen.add(msg.id);

    const today = dayKey(now, this.timezone);
    const parsed = parseFlightQuery(msg.text, { today, isGroup: msg.isGroup });
    if (parsed.status === "ignore") return { action: "ignore" };
    if (parsed.status === "clarify") {
      return { action: "reply", jid: msg.jid, text: clarifyText(parsed) };
    }

    try {
      const fare = await this.findCheapest(parsed.origin, parsed.dest, parsed.window);
      if (!fare) {
        return { action: "reply", jid: msg.jid, text: copy.inbound.none };
      }
      return {
        action: "reply",
        jid: msg.jid,
        text: formatOfferMessage(toOffer(fare, this.search.source)),
      };
    } catch (err) {
      log.warn("busca inbound falhou", err);
      return { action: "reply", jid: msg.jid, text: copy.inbound.fail };
    }
  }

  private async findCheapest(
    origin: ParsedPlace,
    dest: ParsedPlace,
    window: DateWindow,
  ): Promise<RawFare | undefined> {
    const batch: RawFare[] = [];
    for (const code of origin.codes) {
      const query: SearchQuery = {
        originCode: code,
        originCity: origin.city,
        currency: "BRL",
        destinationCode: dest.primary,
        destinationCity: dest.city,
        departFrom: window.start,
        departTo: window.end,
      };
      const fares = await this.search.search(query);
      batch.push(...fares);
    }
    const matched = batch.filter((fare) => matchesRequest(fare, dest, window));
    matched.sort((a, b) => a.priceBRL - b.priceBRL);
    return matched[0];
  }
}

export function clarifyText(parsed: ParseClarify): string {
  if (parsed.reason === "tooWide") return copy.inbound.tooWide;
  if (parsed.reason === "samePlace") return copy.inbound.samePlace;
  if (parsed.missing.length !== 1) return copy.inbound.askAll;
  const only = parsed.missing[0];
  if (only === "origin") return copy.inbound.askOrigin;
  if (only === "dest") return copy.inbound.askDest;
  return copy.inbound.askWhen;
}

function matchesRequest(fare: RawFare, dest: ParsedPlace, window: DateWindow): boolean {
  const destOk =
    dest.codes.includes(fare.destinationCode.toUpperCase()) ||
    foldPt(fare.destinationCity) === foldPt(dest.city);
  if (!destOk) return false;
  return fare.departDate >= window.start && fare.departDate <= window.end;
}

function toOffer(fare: RawFare, source: FlightOffer["source"]): FlightOffer {
  const foundAt = new Date().toISOString();
  const fingerprint = fareFingerprint(fare);
  return {
    id: offerId(fingerprint, foundAt),
    fingerprint,
    origin: { code: fare.originCode, city: fare.originCity },
    destination: { code: fare.destinationCode, city: fare.destinationCity },
    departDate: fare.departDate,
    returnDate: fare.returnDate,
    priceBRL: fare.priceBRL,
    airline: fare.airline,
    stops: fare.stops,
    outboundTimes: fare.outboundTimes,
    returnTimes: fare.returnTimes,
    source,
    foundAt,
    deepLink: fare.deepLink,
    promoScore: 0,
  };
}
