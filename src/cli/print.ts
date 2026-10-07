import { formatPtDate } from "../lib/clock.ts";
import { formatBRL, formatOfferMessage } from "../offers/template.ts";
import type { StoredOffer } from "../offers/types.ts";

export function printOffers(offers: StoredOffer[], brandName: string): void {
  if (offers.length === 0) {
    console.log("nenhuma oferta nova nesta rodada");
    return;
  }

  console.log(`\n${offers.length} oferta(s) na fila:\n`);
  for (const offer of offers) {
    console.log(
      `${offer.origin.code} → ${offer.destination.city} · ${formatPtDate(offer.departDate)} a ${formatPtDate(offer.returnDate)} · ${formatBRL(offer.priceBRL)}`,
    );
    console.log(formatOfferMessage(offer, brandName));
    console.log("----");
  }
}
