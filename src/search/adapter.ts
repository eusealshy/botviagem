import type { OfferSource, RawFare } from "../offers/types.ts";

export type SearchQuery = {
  originCode: string;
  originCity: string;
  currency: "BRL";
  destinationCode?: string;
  destinationCity?: string;
  /** Inclusive ISO day (YYYY-MM-DD) for outbound. */
  departFrom?: string;
  /** Inclusive ISO day (YYYY-MM-DD) for outbound. */
  departTo?: string;
};

export interface FlightSearchAdapter {
  readonly source: OfferSource;
  search(query: SearchQuery): Promise<RawFare[]>;
}
