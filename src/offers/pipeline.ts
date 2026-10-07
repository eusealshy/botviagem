import { originByCode } from "../config/origins.ts";
import type { Config } from "../config/env.ts";
import { log } from "../lib/log.ts";
import type { FlightSearchAdapter } from "../search/adapter.ts";
import { fareFingerprint, offerId } from "./fingerprint.ts";
import { isPromoWorthy, scoreFare } from "./rank.ts";
import type { OfferStore } from "./store.ts";
import type { FlightOffer, RawFare, StoredOffer } from "./types.ts";

export class OfferPipeline {
  constructor(
    private readonly config: Config,
    private readonly store: OfferStore,
    private readonly search: FlightSearchAdapter,
  ) {}

  async run(origins = this.config.origins): Promise<StoredOffer[]> {
    const foundAt = new Date().toISOString();
    const batch: RawFare[] = [];

    for (const code of origins) {
      const origin = originByCode(code);
      try {
        const fares = await this.search.search({
          originCode: origin.code,
          originCity: origin.city,
          currency: "BRL",
        });
        batch.push(...fares);
      } catch (err) {
        log.warn(`busca falhou em ${origin.code}`, err);
      }
    }

    const scored = batch
      .map((fare) => {
        const promoScore = scoreFare(fare, batch);
        return { fare, promoScore };
      })
      .filter((item) => isPromoWorthy(item.promoScore))
      .sort((a, b) => b.promoScore - a.promoScore || a.fare.priceBRL - b.fare.priceBRL)
      .slice(0, 12);

    const offers: FlightOffer[] = scored.map(({ fare, promoScore }) => {
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
        source: this.search.source,
        foundAt,
        deepLink: fare.deepLink,
        promoScore,
      };
    });

    const queued = await this.store.enqueue(offers);
    log.info(
      `busca ${this.search.source}: ${batch.length} tarifas, ${offers.length} promocionais, ${queued.length} novas na fila`,
    );
    return queued;
  }
}
