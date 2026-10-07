import { addDays, isoDiffDays, startOfWeekMonday } from "../lib/clock.ts";
import { foldPt } from "../lib/fold.ts";
import { findPlaceMentions, type ParsedPlace } from "./places.ts";

const BOT_PREFIX = /^(?:@)?bot\b\s*[,:\-–]?\s*/i;
const FLIGHT_ASK = /\b(voo|voos|passagem|passagens|aereo|mais barato|barato)\b/;
const MAX_WINDOW_DAYS = 7;

const MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

export type DateWindow = {
  kind: "day" | "week";
  start: string;
  end: string;
};

export type ParseOk = {
  status: "ok";
  origin: ParsedPlace;
  dest: ParsedPlace;
  window: DateWindow;
};

export type ParseClarify = {
  status: "clarify";
  reason: "missing" | "tooWide" | "samePlace";
  missing: Array<"origin" | "dest" | "when">;
};

export type ParseIgnore = { status: "ignore" };

export type ParseResult = ParseOk | ParseClarify | ParseIgnore;

export type ParseContext = {
  today: string;
  isGroup: boolean;
};

export function isBotCommand(text: string): boolean {
  return BOT_PREFIX.test(text.trim());
}

export function looksLikeFlightAsk(text: string): boolean {
  return FLIGHT_ASK.test(foldPt(text));
}

/** Groups: only messages that start with "bot". DMs: that, or a passage-price ask. */
export function shouldHandleInbound(text: string, isGroup: boolean): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isBotCommand(trimmed)) return true;
  if (isGroup) return false;
  return looksLikeFlightAsk(trimmed);
}

export function stripBotPrefix(text: string): string {
  return text.trim().replace(BOT_PREFIX, "").trim();
}

export function parseFlightQuery(text: string, ctx: ParseContext): ParseResult {
  if (!shouldHandleInbound(text, ctx.isGroup)) return { status: "ignore" };

  const body = stripBotPrefix(text);
  const dated = parseWhen(body, ctx.today);
  const route = parseRoute(dated.rest);

  if (dated.tooWide) {
    return { status: "clarify", reason: "tooWide", missing: [] };
  }

  const missing: ParseClarify["missing"] = [];
  if (!route.origin) missing.push("origin");
  if (!route.dest) missing.push("dest");
  if (!dated.window) missing.push("when");

  if (missing.length > 0) {
    return { status: "clarify", reason: "missing", missing };
  }

  if (!route.origin || !route.dest || !dated.window) {
    return { status: "clarify", reason: "missing", missing: ["origin", "dest", "when"] };
  }

  if (samePlace(route.origin, route.dest)) {
    return { status: "clarify", reason: "samePlace", missing: [] };
  }

  return {
    status: "ok",
    origin: route.origin,
    dest: route.dest,
    window: dated.window,
  };
}

function samePlace(a: ParsedPlace, b: ParsedPlace): boolean {
  if (a.city === b.city) return true;
  return a.codes.some((code) => b.codes.includes(code));
}

function parseRoute(text: string): { origin: ParsedPlace | undefined; dest: ParsedPlace | undefined } {
  const folded = foldPt(text);
  const mentions = findPlaceMentions(folded);
  if (mentions.length === 0) return { origin: undefined, dest: undefined };

  if (mentions.length === 1) {
    const only = mentions[0];
    if (!only) return { origin: undefined, dest: undefined };
    const before = folded.slice(0, only.start);
    if (/\b(pra|para|pro)\b/.test(before) && !/\bsaindo de\b/.test(before)) {
      return { origin: undefined, dest: only };
    }
    return { origin: only, dest: undefined };
  }

  for (let i = 0; i < mentions.length - 1; i += 1) {
    const left = mentions[i];
    const right = mentions[i + 1];
    if (!left || !right) continue;
    const between = folded.slice(left.end, right.start);
    if (/\b(pra|para|pro|p)\b/.test(between) || /(?:^|\s)(?:x|->)(?:\s|$)/.test(between)) {
      return { origin: left, dest: right };
    }
  }

  const first = mentions[0];
  const second = mentions[1];
  if (first && second) return { origin: first, dest: second };
  return { origin: undefined, dest: undefined };
}

type WhenParse = {
  window: DateWindow | undefined;
  tooWide: boolean;
  rest: string;
};

function foldKeepDates(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9/\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseWhen(text: string, today: string): WhenParse {
  const folded = foldKeepDates(text);

  const range = matchDateRange(folded, today);
  if (range) return range;

  const weekPhrase = matchWeekPhrase(folded, today);
  if (weekPhrase) return weekPhrase;

  const named = matchNamedDay(folded, today);
  if (named) return named;

  const monthName = matchDayMonthName(folded, today);
  if (monthName) return monthName;

  const slash = matchSlashDate(folded, today);
  if (slash) return slash;

  const dayOnly = matchBareDay(folded, today);
  if (dayOnly) return dayOnly;

  return { window: undefined, tooWide: false, rest: text };
}

function matchDateRange(folded: string, today: string): WhenParse | undefined {
  const match = folded.match(
    /\b(?:de|entre|do dia|dia)?\s*(\d{1,2})(?:\s*[\/\-]\s*(\d{1,2}))?\s+(?:a|ate|e|ao)\s+(?:dia\s+)?(\d{1,2})\s*[\/\-]\s*(\d{1,2})(?:\s*[\/\-]\s*(\d{2,4}))?\b/,
  );
  if (!match) return undefined;
  const startDay = Number(match[1]);
  const endDay = Number(match[3]);
  const endMonth = Number(match[4]);
  const startMonth = match[2] ? Number(match[2]) : endMonth;
  const yearHint = match[5] ? normalizeYear(Number(match[5])) : undefined;
  const start = resolveYmd(today, startDay, startMonth, yearHint);
  const end = resolveYmd(today, endDay, endMonth, yearHint);
  if (!start || !end) return undefined;
  const span = isoDiffDays(start, end) + 1;
  if (span < 1) return { window: undefined, tooWide: true, rest: stripMatch(folded, match) };
  if (span > MAX_WINDOW_DAYS) return { window: undefined, tooWide: true, rest: stripMatch(folded, match) };
  const kind = span === 1 ? "day" : "week";
  return {
    window: { kind, start, end: kind === "day" ? start : end },
    tooWide: false,
    rest: stripMatch(folded, match),
  };
}

function matchWeekPhrase(folded: string, today: string): WhenParse | undefined {
  if (/\bproximos?\s+7\s+dias\b/.test(folded)) {
    const match = folded.match(/\bproximos?\s+7\s+dias\b/);
    return {
      window: { kind: "week", start: today, end: addDays(today, 6) },
      tooWide: false,
      rest: match ? stripMatch(folded, match) : folded,
    };
  }

  if (/\bsemana\s+que\s+vem\b/.test(folded) || /\bproxima\s+semana\b/.test(folded)) {
    const monday = addDays(startOfWeekMonday(today), 7);
    const match = folded.match(/\b(?:semana que vem|proxima semana)\b/);
    return {
      window: { kind: "week", start: monday, end: addDays(monday, 6) },
      tooWide: false,
      rest: match ? stripMatch(folded, match) : folded,
    };
  }

  if (/\b(?:essa|esta)\s+semana\b/.test(folded) || /\bsemana\s+atual\b/.test(folded)) {
    const monday = startOfWeekMonday(today);
    const match = folded.match(/\b(?:essa semana|esta semana|semana atual)\b/);
    return {
      window: { kind: "week", start: monday, end: addDays(monday, 6) },
      tooWide: false,
      rest: match ? stripMatch(folded, match) : folded,
    };
  }

  const weekOf = folded.match(/\bsemana\s+(?:do\s+dia|de|do)\s+(\d{1,2})(?:\s*[\/\-]\s*(\d{1,2}))?\b/);
  if (weekOf?.[1]) {
    const day = Number(weekOf[1]);
    const month = weekOf[2] ? Number(weekOf[2]) : monthOf(today);
    const start = resolveYmd(today, day, month, undefined);
    if (!start) return undefined;
    return {
      window: { kind: "week", start, end: addDays(start, 6) },
      tooWide: false,
      rest: stripMatch(folded, weekOf),
    };
  }

  if (/\bsemana\b/.test(folded) && !/\bdia\b/.test(folded)) {
    return { window: undefined, tooWide: false, rest: folded };
  }

  return undefined;
}

function matchNamedDay(folded: string, today: string): WhenParse | undefined {
  if (/\bhoje\b/.test(folded)) {
    const match = folded.match(/\bhoje\b/);
    return dayWindow(today, match ? stripMatch(folded, match) : folded);
  }
  if (/\bamanha\b/.test(folded)) {
    const match = folded.match(/\bamanha\b/);
    return dayWindow(addDays(today, 1), match ? stripMatch(folded, match) : folded);
  }
  return undefined;
}

function matchDayMonthName(folded: string, today: string): WhenParse | undefined {
  const match = folded.match(
    /\b(?:dia|no dia|em)?\s*(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?\b/,
  );
  if (!match?.[1] || !match[2]) return undefined;
  const month = MONTHS[match[2]];
  if (!month) return undefined;
  const year = match[3] ? Number(match[3]) : undefined;
  const iso = resolveYmd(today, Number(match[1]), month, year);
  if (!iso) return undefined;
  return dayWindow(iso, stripMatch(folded, match));
}

function matchSlashDate(folded: string, today: string): WhenParse | undefined {
  const match = folded.match(/\b(?:dia|no dia|em)?\s*(\d{1,2})\s*[\/\-]\s*(\d{1,2})(?:\s*[\/\-]\s*(\d{2,4}))?\b/);
  if (!match?.[1] || !match[2]) return undefined;
  const iso = resolveYmd(today, Number(match[1]), Number(match[2]), match[3] ? normalizeYear(Number(match[3])) : undefined);
  if (!iso) return undefined;
  return dayWindow(iso, stripMatch(folded, match));
}

function matchBareDay(folded: string, today: string): WhenParse | undefined {
  const match = folded.match(/\b(?:dia|no dia)\s+(\d{1,2})\b/);
  if (!match?.[1]) return undefined;
  const day = Number(match[1]);
  const thisMonth = monthOf(today);
  let iso = resolveYmd(today, day, thisMonth, yearOf(today));
  if (iso && iso < today) {
    const nextMonth = thisMonth === 12 ? 1 : thisMonth + 1;
    const year = thisMonth === 12 ? yearOf(today) + 1 : yearOf(today);
    iso = resolveYmd(today, day, nextMonth, year);
  }
  if (!iso) return undefined;
  return dayWindow(iso, stripMatch(folded, match));
}

function dayWindow(iso: string, rest: string): WhenParse {
  return { window: { kind: "day", start: iso, end: iso }, tooWide: false, rest };
}

function resolveYmd(today: string, day: number, month: number, year: number | undefined): string | undefined {
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
  const y = year ?? pickYear(today, day, month);
  const iso = `${String(y).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
  if (Number.isNaN(Date.parse(`${iso}T12:00:00Z`))) return undefined;
  return iso;
}

function pickYear(today: string, day: number, month: number): number {
  const year = yearOf(today);
  const candidate = `${year}-${pad(month)}-${pad(day)}`;
  if (candidate >= today) return year;
  return year + 1;
}

function yearOf(iso: string): number {
  return Number(iso.slice(0, 4));
}

function monthOf(iso: string): number {
  return Number(iso.slice(5, 7));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function normalizeYear(year: number): number {
  if (year < 100) return 2000 + year;
  return year;
}

function stripMatch(folded: string, match: RegExpMatchArray): string {
  const index = match.index ?? 0;
  return `${folded.slice(0, index)} ${folded.slice(index + match[0].length)}`.replace(/\s+/g, " ").trim();
}
