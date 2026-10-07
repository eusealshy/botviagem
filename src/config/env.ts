import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { ORIGIN_AIRPORTS } from "./origins.ts";

export type SearchAdapterName = "mock" | "playwright" | "api";

export type Config = {
  timezone: string;
  checkHours: number[];
  maxPostsPerDay: number;
  origins: string[];
  brandName: string;
  searchAdapter: SearchAdapterName;
  flightApiUrl: string | undefined;
  flightApiKey: string | undefined;
  playwrightHeadless: boolean;
  whatsappEnabled: boolean;
  whatsappGroupJid: string | undefined;
  whatsappAdminJid: string | undefined;
  dataDir: string;
  webHost: string;
  webPort: number;
  runOnce: boolean;
  cliApprove: boolean;
};

function read(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? fallback : value.trim();
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  return ["1", "true", "yes", "sim"].includes(raw.trim().toLowerCase());
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} precisa ser um número (recebi "${raw}")`);
  }
  return parsed;
}

function parseHours(raw: string): number[] {
  const hours = raw
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23);
  if (hours.length === 0) {
    throw new Error("CHECK_HOURS não tem nenhum horário válido");
  }
  return [...new Set(hours)].sort((a, b) => a - b);
}

function parseOrigins(raw: string): string[] {
  const codes = raw
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  return codes.length > 0 ? codes : ORIGIN_AIRPORTS.map((item) => item.code);
}

function parseAdapter(raw: string): SearchAdapterName {
  if (raw === "mock" || raw === "playwright" || raw === "api") return raw;
  throw new Error(`SEARCH_ADAPTER inválido: ${raw} (use mock, playwright ou api)`);
}

export function loadConfig(argv = process.argv.slice(2)): Config {
  loadDotenv();

  const searchAdapter = parseAdapter(read("SEARCH_ADAPTER", "mock"));
  const flightApiUrl = read("FLIGHT_API_URL", "") || undefined;

  if (searchAdapter === "api" && !flightApiUrl) {
    throw new Error("SEARCH_ADAPTER=api pede FLIGHT_API_URL no .env");
  }

  return {
    timezone: read("TZ", "America/Sao_Paulo"),
    checkHours: parseHours(read("CHECK_HOURS", "3,9,14,19")),
    maxPostsPerDay: readInt("MAX_POSTS_PER_DAY", 6),
    origins: parseOrigins(read("ORIGINS", "GRU,CGH,GIG,SDU,REC,VCP")),
    brandName: read("BRAND_NAME", "[Sua Agência]"),
    searchAdapter,
    flightApiUrl,
    flightApiKey: read("FLIGHT_API_KEY", "") || undefined,
    playwrightHeadless: readBool("PLAYWRIGHT_HEADLESS", true),
    whatsappEnabled: readBool("WHATSAPP_ENABLED", false),
    whatsappGroupJid: read("WHATSAPP_GROUP_JID", "") || undefined,
    whatsappAdminJid: read("WHATSAPP_ADMIN_JID", "") || undefined,
    dataDir: resolve(read("DATA_DIR", "./data")),
    webHost: read("WEB_HOST", "127.0.0.1"),
    webPort: readInt("WEB_PORT", 3847),
    runOnce: argv.includes("--once"),
    cliApprove: argv.includes("--cli"),
  };
}
