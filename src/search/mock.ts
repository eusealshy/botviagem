import { addDays, dayKey } from "../lib/clock.ts";
import type { RawFare } from "../offers/types.ts";
import type { FlightSearchAdapter, SearchQuery } from "./adapter.ts";

type CatalogRow = {
  code: string;
  city: string;
  base: number;
  international?: boolean;
};

const CATALOG: readonly CatalogRow[] = [
  { code: "SSA", city: "Salvador", base: 318 },
  { code: "FOR", city: "Fortaleza", base: 356 },
  { code: "NAT", city: "Natal", base: 389 },
  { code: "MCZ", city: "Maceió", base: 342 },
  { code: "REC", city: "Recife", base: 329 },
  { code: "MAO", city: "Manaus", base: 612 },
  { code: "BEL", city: "Belém", base: 548 },
  { code: "IGU", city: "Foz do Iguaçu", base: 412 },
  { code: "FLN", city: "Florianópolis", base: 298 },
  { code: "CWB", city: "Curitiba", base: 276 },
  { code: "POA", city: "Porto Alegre", base: 334 },
  { code: "BSB", city: "Brasília", base: 289 },
  { code: "EZE", city: "Buenos Aires", base: 890, international: true },
  { code: "SCL", city: "Santiago", base: 1120, international: true },
  { code: "LIS", city: "Lisboa", base: 1840, international: true },
  { code: "MIA", city: "Miami", base: 1680, international: true },
];

const AIRLINES = ["LATAM", "Gol", "Azul"] as const;

export class MockSearchAdapter implements FlightSearchAdapter {
  readonly source = "mock" as const;

  constructor(private readonly timezone: string) {}

  async search(query: SearchQuery): Promise<RawFare[]> {
    const today = dayKey(new Date(), this.timezone);
    const seed = seedFrom(`${today}|${query.originCode}`);
    const picks = pickRows(query.originCode, seed, 5);
    return picks.map((row, index) => {
      const departOffset = 18 + (seed + index * 7) % 28;
      const stay = 4 + ((seed + index) % 5);
      const jitter = ((seed + index * 13) % 9) - 4;
      const promoCut = index === 0 ? 0.78 : index === 1 ? 0.86 : 0.97;
      const price = Math.max(219, Math.round((row.base * promoCut + jitter * 8) / 10) * 10);
      return {
        originCode: query.originCode,
        originCity: query.originCity,
        destinationCode: row.code,
        destinationCity: row.city,
        departDate: addDays(today, departOffset),
        returnDate: addDays(today, departOffset + stay),
        priceBRL: price,
        airline: AIRLINES[(seed + index) % AIRLINES.length] ?? "LATAM",
        stops: index === 2 ? 1 : 0,
        outboundTimes: undefined,
        returnTimes: undefined,
        deepLink: `https://www.google.com/travel/flights?hl=pt-BR&curr=BRL&q=flights%20${query.originCode}%20to%20${row.code}`,
      };
    });
  }
}

function seedFrom(value: string): number {
  let acc = 0;
  for (const char of value) acc = (acc * 33 + char.charCodeAt(0)) >>> 0;
  return acc;
}

function pickRows(originCode: string, seed: number, count: number): CatalogRow[] {
  const pool = CATALOG.filter((row) => row.code !== originCode);
  const chosen: CatalogRow[] = [];
  let cursor = seed;
  while (chosen.length < count && chosen.length < pool.length) {
    const index = cursor % pool.length;
    const row = pool[index];
    if (row && !chosen.includes(row)) chosen.push(row);
    cursor = (cursor * 17 + 31) >>> 0;
  }
  return chosen;
}
