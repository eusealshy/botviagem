import type { RawFare } from "../offers/types.ts";
import type { FlightSearchAdapter, SearchQuery } from "./adapter.ts";

type ApiPayload = {
  offers?: Array<{
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
  }>;
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
          deepLink: row.deepLink ?? undefined,
        },
      ];
    });
  }
}
