import type { RawFare } from "./types.ts";

/**
 * Surfaces promotional or unusually cheap fares without a fixed
 * destination list. Score is relative to the current batch plus a
 * loose domestic/international floor.
 */
export function scoreFare(fare: RawFare, batch: readonly RawFare[]): number {
  const prices = batch.map((item) => item.priceBRL).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)] ?? fare.priceBRL;
  const vsMedian = median <= 0 ? 0 : (median - fare.priceBRL) / median;
  const floor = internationalHint(fare.destinationCity) ? 1400 : 520;
  const vsFloor = fare.priceBRL < floor ? (floor - fare.priceBRL) / floor : 0;
  const directBonus = fare.stops === 0 ? 0.08 : 0;
  return Number((vsMedian * 0.55 + vsFloor * 0.37 + directBonus).toFixed(4));
}

export function isPromoWorthy(score: number): boolean {
  return score >= 0.12;
}

function internationalHint(city: string): boolean {
  const text = city.normalize("NFD").toLowerCase();
  return [
    "lisboa",
    "madrid",
    "miami",
    "orlando",
    "buenos aires",
    "santiago",
    "paris",
    "roma",
    "nova york",
    "new york",
    "cidade do mexico",
    "cancun",
    "lima",
  ].some((name) => text.includes(name));
}
