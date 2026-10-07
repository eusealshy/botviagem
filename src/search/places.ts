import { foldPt } from "../lib/fold.ts";

export type Place = {
  city: string;
  codes: readonly string[];
  aliases: readonly string[];
};

export type ParsedPlace = {
  city: string;
  codes: string[];
  primary: string;
};

/**
 * Brazilian (and nearby) cities the chat parser can resolve.
 * Airport-code aliases pin a single airport; city aliases search every code.
 */
export const PLACES: readonly Place[] = [
  { city: "São Paulo", codes: ["GRU", "CGH"], aliases: ["sao paulo", "s paulo"] },
  { city: "São Paulo", codes: ["GRU"], aliases: ["gru", "guarulhos"] },
  { city: "São Paulo", codes: ["CGH"], aliases: ["cgh", "congonhas"] },
  { city: "Campinas", codes: ["VCP"], aliases: ["campinas", "vcp", "viracopos"] },
  { city: "Rio de Janeiro", codes: ["GIG", "SDU"], aliases: ["rio de janeiro", "rio"] },
  { city: "Rio de Janeiro", codes: ["GIG"], aliases: ["gig", "galeao"] },
  { city: "Rio de Janeiro", codes: ["SDU"], aliases: ["sdu", "santos dumont"] },
  { city: "Natal", codes: ["NAT"], aliases: ["natal", "nat"] },
  { city: "Recife", codes: ["REC"], aliases: ["recife", "rec"] },
  { city: "Salvador", codes: ["SSA"], aliases: ["salvador", "ssa"] },
  { city: "Fortaleza", codes: ["FOR"], aliases: ["fortaleza", "for"] },
  { city: "Maceió", codes: ["MCZ"], aliases: ["maceio", "mcz"] },
  { city: "João Pessoa", codes: ["JPA"], aliases: ["joao pessoa", "jpa"] },
  { city: "Fernando de Noronha", codes: ["FEN"], aliases: ["fernando de noronha", "noronha", "fen"] },
  { city: "Brasília", codes: ["BSB"], aliases: ["brasilia", "bsb"] },
  { city: "Belo Horizonte", codes: ["CNF"], aliases: ["belo horizonte", "bh", "cnf", "confins"] },
  { city: "Curitiba", codes: ["CWB"], aliases: ["curitiba", "cwb"] },
  { city: "Florianópolis", codes: ["FLN"], aliases: ["florianopolis", "floripa", "fln"] },
  { city: "Porto Alegre", codes: ["POA"], aliases: ["porto alegre", "poa"] },
  { city: "Foz do Iguaçu", codes: ["IGU"], aliases: ["foz do iguacu", "foz", "iguacu", "igu"] },
  { city: "Manaus", codes: ["MAO"], aliases: ["manaus", "mao"] },
  { city: "Belém", codes: ["BEL"], aliases: ["belem", "bel"] },
  { city: "Goiânia", codes: ["GYN"], aliases: ["goiania", "gyn"] },
  { city: "Vitória", codes: ["VIX"], aliases: ["vitoria", "vix"] },
  { city: "Cuiabá", codes: ["CGB"], aliases: ["cuiaba", "cgb"] },
  { city: "Campo Grande", codes: ["CGR"], aliases: ["campo grande", "cgr"] },
  { city: "Gramado", codes: ["CXJ"], aliases: ["gramado"] },
  { city: "Buenos Aires", codes: ["EZE"], aliases: ["buenos aires", "eze", "ezeiza"] },
  { city: "Santiago", codes: ["SCL"], aliases: ["santiago", "scl"] },
  { city: "Lisboa", codes: ["LIS"], aliases: ["lisboa", "lis"] },
  { city: "Miami", codes: ["MIA"], aliases: ["miami", "mia"] },
];

type AliasHit = {
  alias: string;
  place: Place;
};

const ALIASES: AliasHit[] = PLACES.flatMap((place) =>
  place.aliases.map((alias) => ({ alias, place })),
).sort((a, b) => b.alias.length - a.alias.length);

export function resolvePlace(token: string): ParsedPlace | undefined {
  const folded = foldPt(token);
  if (!folded) return undefined;
  const hit = ALIASES.find((item) => item.alias === folded);
  if (!hit) return undefined;
  return toParsed(hit.place);
}

export type PlaceMention = ParsedPlace & { start: number; end: number };

export function findPlaceMentions(folded: string): PlaceMention[] {
  const occupied = new Array<boolean>(folded.length).fill(false);
  const mentions: PlaceMention[] = [];
  for (const hit of ALIASES) {
    let from = 0;
    while (from < folded.length) {
      const idx = folded.indexOf(hit.alias, from);
      if (idx < 0) break;
      const end = idx + hit.alias.length;
      if (!isBoundary(folded, idx, end) || isOccupied(occupied, idx, end)) {
        from = idx + 1;
        continue;
      }
      markOccupied(occupied, idx, end);
      mentions.push({ ...toParsed(hit.place), start: idx, end });
      from = end;
    }
  }
  return mentions.sort((a, b) => a.start - b.start);
}

function toParsed(place: Place): ParsedPlace {
  const codes = [...place.codes];
  return {
    city: place.city,
    codes,
    primary: codes[0] ?? "XXX",
  };
}

function isBoundary(text: string, start: number, end: number): boolean {
  const before = start === 0 ? " " : text[start - 1];
  const after = end >= text.length ? " " : text[end];
  return before === " " && (after === " " || after === undefined);
}

function isOccupied(flags: boolean[], start: number, end: number): boolean {
  for (let i = start; i < end; i += 1) {
    if (flags[i]) return true;
  }
  return false;
}

function markOccupied(flags: boolean[], start: number, end: number): void {
  for (let i = start; i < end; i += 1) flags[i] = true;
}
