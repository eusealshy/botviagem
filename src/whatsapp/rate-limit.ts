import { dayKey } from "../lib/clock.ts";
import type { OfferStore } from "../offers/store.ts";

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; remaining: 0; used: number; max: number };

export function checkDailyLimit(
  store: OfferStore,
  maxPostsPerDay: number,
  timezone: string,
  now = new Date(),
): RateLimitResult {
  const used = store.postedOn(dayKey(now, timezone), timezone).length;
  if (used >= maxPostsPerDay) {
    return { ok: false, remaining: 0, used, max: maxPostsPerDay };
  }
  return { ok: true, remaining: maxPostsPerDay - used };
}
