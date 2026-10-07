export function dayKey(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("não consegui montar a data no fuso configurado");
  }
  return `${year}-${month}-${day}`;
}

export function hourInZone(now: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return Number.parseInt(hour, 10);
}

export function formatPtDate(isoDay: string): string {
  const [year, month, day] = isoDay.split("-");
  if (!year || !month || !day) return isoDay;
  return `${day}/${month}`;
}

/** Same month: 11 → 16/11. Different months: 28/11 → 03/12. */
export function formatOfferDateRange(departIso: string, returnIso: string): string {
  const depart = splitIsoDay(departIso);
  const back = splitIsoDay(returnIso);
  if (!depart || !back) return `${departIso} → ${returnIso}`;
  if (depart.year === back.year && depart.month === back.month) {
    return `${depart.day} → ${back.day}/${back.month}`;
  }
  return `${depart.day}/${depart.month} → ${back.day}/${back.month}`;
}

function splitIsoDay(isoDay: string): { year: string; month: string; day: string } | undefined {
  const [year, month, day] = isoDay.split("-");
  if (!year || !month || !day) return undefined;
  return { year, month, day };
}

export function addDays(isoDay: string, days: number): string {
  const date = new Date(`${isoDay}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
