export type OriginAirport = {
  code: string;
  city: string;
  label: string;
};

export const ORIGIN_AIRPORTS: readonly OriginAirport[] = [
  { code: "GRU", city: "São Paulo", label: "São Paulo (Guarulhos)" },
  { code: "CGH", city: "São Paulo", label: "São Paulo (Congonhas)" },
  { code: "GIG", city: "Rio de Janeiro", label: "Rio de Janeiro (Galeão)" },
  { code: "SDU", city: "Rio de Janeiro", label: "Rio de Janeiro (Santos Dumont)" },
  { code: "REC", city: "Recife", label: "Recife" },
  { code: "VCP", city: "Campinas", label: "Campinas (Viracopos)" },
];

const byCode = new Map(ORIGIN_AIRPORTS.map((item) => [item.code, item]));

export function originByCode(code: string): OriginAirport {
  return byCode.get(code.toUpperCase()) ?? {
    code: code.toUpperCase(),
    city: code.toUpperCase(),
    label: code.toUpperCase(),
  };
}
