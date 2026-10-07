import { createHash } from "node:crypto";

export function fareFingerprint(input: {
  originCode: string;
  destinationCode: string;
  departDate: string;
  returnDate: string;
  priceBRL: number;
}): string {
  const bucket = Math.round(input.priceBRL / 40) * 40;
  const raw = [
    input.originCode.toUpperCase(),
    input.destinationCode.toUpperCase(),
    input.departDate,
    input.returnDate,
    String(bucket),
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export function offerId(fingerprint: string, foundAt: string): string {
  return createHash("sha256")
    .update(`${fingerprint}|${foundAt}`)
    .digest("hex")
    .slice(0, 12);
}
