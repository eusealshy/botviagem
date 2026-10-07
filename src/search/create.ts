import type { Config } from "../config/env.ts";
import type { FlightSearchAdapter } from "./adapter.ts";
import { ApiSearchAdapter } from "./api.ts";
import { MockSearchAdapter } from "./mock.ts";

export async function createSearchAdapter(config: Config): Promise<FlightSearchAdapter> {
  if (config.searchAdapter === "mock") {
    return new MockSearchAdapter(config.timezone);
  }
  if (config.searchAdapter === "api") {
    if (!config.flightApiUrl) {
      throw new Error("FLIGHT_API_URL ausente");
    }
    return new ApiSearchAdapter(config.flightApiUrl, config.flightApiKey);
  }
  const { PlaywrightSearchAdapter } = await import("./playwright.ts");
  return new PlaywrightSearchAdapter(config.timezone, config.playwrightHeadless);
}
