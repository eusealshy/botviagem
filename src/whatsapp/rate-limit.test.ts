import assert from "node:assert/strict";
import test from "node:test";
import { dayKey } from "../lib/clock.ts";
import type { OfferStore } from "../offers/store.ts";
import { checkDailyLimit } from "./rate-limit.ts";

function storeWithPosts(dates: string[]): OfferStore {
  return {
    postedOn(day: string, timezone: string) {
      return dates
        .filter((at) => dayKey(new Date(at), timezone) === day)
        .map((at, index) => ({ at, offerId: String(index) }));
    },
  } as OfferStore;
}

test("libera envio abaixo do teto", () => {
  const now = new Date("2026-10-07T18:00:00-03:00");
  const result = checkDailyLimit(storeWithPosts(["2026-10-07T10:00:00.000Z"]), 6, "America/Sao_Paulo", now);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.remaining, 5);
});

test("bloqueia no sexto post do dia", () => {
  const now = new Date("2026-10-07T18:00:00-03:00");
  const posts = Array.from(
    { length: 6 },
    (_, i) => `2026-10-07T${String(8 + i).padStart(2, "0")}:00:00-03:00`,
  );
  const result = checkDailyLimit(storeWithPosts(posts), 6, "America/Sao_Paulo", now);
  assert.equal(result.ok, false);
});
