import { join } from "node:path";
import { dayKey } from "../lib/clock.ts";
import { readJson, writeJson } from "../lib/json-file.ts";
import type { FlightOffer, StoredOffer } from "./types.ts";

type SeenMap = Record<string, string>;

type PersistShape = {
  offers: StoredOffer[];
  seen: SeenMap;
  posts: { at: string; offerId: string }[];
};

const SEEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export class OfferStore {
  private constructor(
    private readonly path: string,
    private data: PersistShape,
  ) {}

  static async open(dataDir: string): Promise<OfferStore> {
    const path = join(dataDir, "offers.json");
    const data = await readJson<PersistShape>(path, {
      offers: [],
      seen: {},
      posts: [],
    });
    return new OfferStore(path, data);
  }

  pending(): StoredOffer[] {
    return this.data.offers.filter((item) => item.status === "pending");
  }

  byId(id: string): StoredOffer | undefined {
    return this.data.offers.find((item) => item.id === id);
  }

  postedOn(day: string, timezone: string): { at: string; offerId: string }[] {
    return this.data.posts.filter((item) => dayKey(new Date(item.at), timezone) === day);
  }

  recentlyPosted(limit = 12): StoredOffer[] {
    return this.data.offers
      .filter((item) => item.status === "posted")
      .sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""))
      .slice(0, limit);
  }

  isSeen(fingerprint: string, now = new Date()): boolean {
    const at = this.data.seen[fingerprint];
    if (!at) return false;
    return now.getTime() - Date.parse(at) < SEEN_TTL_MS;
  }

  async enqueue(offers: FlightOffer[], now = new Date()): Promise<StoredOffer[]> {
    const queued: StoredOffer[] = [];
    const iso = now.toISOString();
    for (const offer of offers) {
      if (this.isSeen(offer.fingerprint, now)) continue;
      if (this.data.offers.some((item) => item.fingerprint === offer.fingerprint && item.status === "pending")) {
        continue;
      }
      const stored: StoredOffer = {
        ...offer,
        status: "pending",
        queuedAt: iso,
        decidedAt: undefined,
        postedAt: undefined,
        error: undefined,
      };
      this.data.offers.push(stored);
      this.data.seen[offer.fingerprint] = iso;
      queued.push(stored);
    }
    this.pruneSeen(now);
    await this.flush();
    return queued;
  }

  async markRejected(id: string, now = new Date()): Promise<StoredOffer | undefined> {
    const offer = this.byId(id);
    if (!offer || offer.status !== "pending") return undefined;
    offer.status = "rejected";
    offer.decidedAt = now.toISOString();
    await this.flush();
    return offer;
  }

  async markPosted(id: string, now = new Date()): Promise<StoredOffer | undefined> {
    const offer = this.byId(id);
    if (!offer) return undefined;
    const iso = now.toISOString();
    offer.status = "posted";
    offer.decidedAt = iso;
    offer.postedAt = iso;
    offer.error = undefined;
    this.data.posts.push({ at: iso, offerId: id });
    await this.flush();
    return offer;
  }

  async markFailed(id: string, error: string, now = new Date()): Promise<void> {
    const offer = this.byId(id);
    if (!offer) return;
    offer.status = "failed";
    offer.decidedAt = now.toISOString();
    offer.error = error;
    await this.flush();
  }

  async restorePending(id: string): Promise<void> {
    const offer = this.byId(id);
    if (!offer) return;
    offer.status = "pending";
    offer.decidedAt = undefined;
    offer.error = undefined;
    await this.flush();
  }

  private pruneSeen(now: Date): void {
    for (const [key, at] of Object.entries(this.data.seen)) {
      if (now.getTime() - Date.parse(at) >= SEEN_TTL_MS) {
        delete this.data.seen[key];
      }
    }
  }

  private async flush(): Promise<void> {
    await writeJson(this.path, this.data);
  }
}
