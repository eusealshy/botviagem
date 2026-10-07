export type OfferSource = "mock" | "playwright" | "api";

export type OfferStatus =
  | "pending"
  | "rejected"
  | "posted"
  | "failed";

export type AirportRef = {
  code: string;
  city: string;
};

export type FlightOffer = {
  id: string;
  fingerprint: string;
  origin: AirportRef;
  destination: AirportRef;
  departDate: string;
  returnDate: string;
  priceBRL: number;
  airline: string | undefined;
  stops: number;
  source: OfferSource;
  foundAt: string;
  deepLink: string | undefined;
  promoScore: number;
};

export type StoredOffer = FlightOffer & {
  status: OfferStatus;
  queuedAt: string;
  decidedAt: string | undefined;
  postedAt: string | undefined;
  error: string | undefined;
};

export type RawFare = {
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  departDate: string;
  returnDate: string;
  priceBRL: number;
  airline: string | undefined;
  stops: number;
  deepLink: string | undefined;
};
