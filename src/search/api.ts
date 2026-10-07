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
      return [
        {
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
        },
      ];
    });
  }
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
