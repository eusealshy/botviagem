import type { LegTimes, RawFare } from "../offers/types.ts";
import type { FlightSearchAdapter, SearchQuery } from "./adapter.ts";

type ApiLegTimes = {
  depart?: string;
  arrive?: string;
};

type ApiOfferRow = {
  originCode?: string;
  originCity?: string;
  destinationCode?: string;
  destinationCity?: string;
  departDate?: string;
  returnDate?: string;
  priceBRL?: number;
  airline?: string;
  stops?: number;
  deepLink?: string;
  outboundTimes?: ApiLegTimes;
  returnTimes?: ApiLegTimes;
  departTime?: string;
  arriveTime?: string;
  returnDepartTime?: string;
  returnArriveTime?: string;
};

type ApiPayload = {
  offers?: ApiOfferRow[];
};

export class ApiSearchAdapter implements FlightSearchAdapter {
  readonly source = "api" as const;

  constructor(
    private readonly url: string,
    private readonly apiKey: string | undefined,
  ) {}

  async search(query: SearchQuery): Promise<RawFare[]> {
    const target = new URL(this.url);
    target.searchParams.set("origin", query.originCode);
    target.searchParams.set("currency", query.currency);
    if (query.destinationCode) target.searchParams.set("destination", query.destinationCode);
    if (query.destinationCity) target.searchParams.set("destinationCity", query.destinationCity);
    if (query.departFrom) target.searchParams.set("departFrom", query.departFrom);
    if (query.departTo) target.searchParams.set("departTo", query.departTo);

    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const response = await fetch(target, {
      headers,
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`API de voos respondeu ${response.status}`);
    }

    const payload = (await response.json()) as ApiPayload;
    const rows = payload.offers ?? [];
    return rows.flatMap((row) => {
      if (!row.destinationCity || !row.departDate || !row.returnDate || !row.priceBRL) {
        return [];
      }
      const fare: RawFare = {
        originCode: row.originCode ?? query.originCode,
        originCity: row.originCity ?? query.originCity,
        destinationCode: row.destinationCode ?? "XXX",
        destinationCity: row.destinationCity,
        departDate: row.departDate,
        returnDate: row.returnDate,
        priceBRL: row.priceBRL,
        airline: row.airline ?? undefined,
        stops: row.stops ?? 0,
        outboundTimes: readLegTimes(row.outboundTimes, row.departTime, row.arriveTime),
        returnTimes: readLegTimes(row.returnTimes, row.returnDepartTime, row.returnArriveTime),
        deepLink: row.deepLink ?? undefined,
      };
      return matchesQuery(fare, query) ? [fare] : [];
    });
  }
}

function matchesQuery(fare: RawFare, query: SearchQuery): boolean {
  if (query.departFrom && fare.departDate < query.departFrom) return false;
  if (query.departTo && fare.departDate > query.departTo) return false;
  if (!query.destinationCode && !query.destinationCity) return true;
  const codeOk = Boolean(
    query.destinationCode && fare.destinationCode.toUpperCase() === query.destinationCode.toUpperCase(),
  );
  const cityOk = Boolean(
    query.destinationCity && fare.destinationCity.toLowerCase() === query.destinationCity.toLowerCase(),
  );
  return codeOk || cityOk;
}

function readLegTimes(
  nested: ApiLegTimes | undefined,
  departFlat: string | undefined,
  arriveFlat: string | undefined,
): LegTimes | undefined {
  const depart = nested?.depart?.trim() || departFlat?.trim();
  const arrive = nested?.arrive?.trim() || arriveFlat?.trim();
  if (!depart || !arrive) return undefined;
  return { depart, arrive };
}
