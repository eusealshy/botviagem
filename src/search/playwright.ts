import { addDays, dayKey } from "../lib/clock.ts";
import { delay } from "../lib/delay.ts";
import { log } from "../lib/log.ts";
import type { RawFare } from "../offers/types.ts";
import type { FlightSearchAdapter, SearchQuery } from "./adapter.ts";

type PlaywrightModule = typeof import("playwright");

/**
 * Best-effort Google Flights explore scrape. Selectors change;
 * an empty result is a failed search, not a crash. Run this on
 * the agency PC, where a real browser session is less likely to
 * hit a datacenter CAPTCHA.
 */
export class PlaywrightSearchAdapter implements FlightSearchAdapter {
  readonly source = "playwright" as const;

  constructor(
    private readonly timezone: string,
    private readonly headless: boolean,
  ) {}

  async search(query: SearchQuery): Promise<RawFare[]> {
    const playwright = await loadPlaywright();
    const browser = await playwright.chromium.launch({ headless: this.headless });
    try {
      const page = await browser.newPage({
        locale: "pt-BR",
        extraHTTPHeaders: { "Accept-Language": "pt-BR,pt;q=0.9" },
      });
      const today = dayKey(new Date(), this.timezone);
      const depart = addDays(today, 28);
      const back = addDays(today, 35);
      const url =
        `https://www.google.com/travel/flights?hl=pt-BR&gl=BR&curr=BRL` +
        `&q=${encodeURIComponent(`Voos de ${query.originCode} para qualquer lugar ${depart} ${back}`)}`;

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await delay(4_000);
      await dismissConsent(page);

      const extracted = await page.evaluate(readFareCards);

      log.info(`playwright ${query.originCode}: ${extracted.length} preços lidos`);
      return extracted.map((row) => ({
        originCode: query.originCode,
        originCity: query.originCity,
        destinationCode: slugCode(row.city),
        destinationCity: row.city,
        departDate: depart,
        returnDate: back,
        priceBRL: row.priceBRL,
        airline: undefined,
        stops: 0,
        deepLink: url,
      }));
    } finally {
      await browser.close();
    }
  }
}

async function loadPlaywright(): Promise<PlaywrightModule> {
  try {
    return await import("playwright");
  } catch {
    throw new Error(
      "playwright não instalou direito. roda npm install e depois npx playwright install chromium",
    );
  }
}

async function dismissConsent(page: {
  getByRole: (role: "button", opts: { name: RegExp }) => { click: (opts: { timeout: number }) => Promise<void> };
}): Promise<void> {
  const labels = [/aceitar/i, /accept/i, /concordo/i];
  for (const name of labels) {
    try {
      await page.getByRole("button", { name }).click({ timeout: 1500 });
      return;
    } catch {
      // cookie banner missing, fine
    }
  }
}

type BrowserDocument = {
  body: { innerText: string };
};

function readFareCards(): { city: string; priceBRL: number }[] {
  const text = (globalThis as unknown as { document: BrowserDocument }).document.body.innerText ?? "";
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const rows: { city: string; priceBRL: number }[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const match = line.match(/R\$\s*([\d.]+)/);
    if (!match?.[1]) continue;
    const price = Number(match[1].replace(/\./g, ""));
    if (!price || price < 150 || price > 12_000) continue;
    const previous = lines[i - 1] ?? "";
    const city =
      previous.length >= 3 && previous.length < 40 && !/R\$/.test(previous) ? previous : undefined;
    if (!city) continue;
    if (rows.some((row) => row.city === city && row.priceBRL === price)) continue;
    rows.push({ city, priceBRL: price });
  }
  return rows.slice(0, 8);
}

function slugCode(city: string): string {
  return city
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
}
