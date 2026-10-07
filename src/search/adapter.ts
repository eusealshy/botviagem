import type { OfferSource, RawFare } from "../offers/types.ts";

export type SearchQuery = {
  originCode: string;
  originCity: string;
  currency: "BRL";
};

export interface FlightSearchAdapter {
  readonly source: OfferSource;
  search(query: SearchQuery): Promise<RawFare[]>;
}
