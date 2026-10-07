import type { Config } from "../config/env.ts";
import type { SettingsStore } from "../config/settings.ts";
import { copy } from "../copy/strings.ts";
import { dayKey } from "../lib/clock.ts";
import { log } from "../lib/log.ts";
import type { WhatsAppGateway } from "../whatsapp/gateway.ts";
import { checkDailyLimit } from "../whatsapp/rate-limit.ts";
import type { OfferStore } from "./store.ts";
import { formatOfferMessage } from "./template.ts";
import type { StoredOffer } from "./types.ts";

export type PublishOutcome =
  | { ok: true; offer: StoredOffer; preview: string; sent: boolean }
  | { ok: false; reason: "missing" | "rate-limit" | "no-group" | "send-failed"; message: string };

export class Publisher {
  constructor(
    private readonly config: Config,
    private readonly store: OfferStore,
    private readonly settings: SettingsStore,
    private readonly whatsapp: WhatsAppGateway,
  ) {}

  preview(offer: StoredOffer): string {
    return formatOfferMessage(offer);
  }

  postedToday(): number {
    return this.store.postedOn(dayKey(new Date(), this.config.timezone), this.config.timezone).length;
  }

  async approve(id: string): Promise<PublishOutcome> {
    const offer = this.store.byId(id);
    if (!offer || offer.status !== "pending") {
      return { ok: false, reason: "missing", message: copy.errors.notFound };
    }

    const limit = checkDailyLimit(
      this.store,
      this.config.maxPostsPerDay,
      this.config.timezone,
    );
    if (!limit.ok) {
      return {
        ok: false,
        reason: "rate-limit",
        message: copy.cli.rateLimited(this.config.maxPostsPerDay),
      };
    }

    const preview = this.preview(offer);
    const groupJid = this.settings.groupJid ?? this.config.whatsappGroupJid;
    const wa = this.whatsapp.status();

    if (wa.enabled && !groupJid) {
      return { ok: false, reason: "no-group", message: copy.errors.noGroup };
    }

    try {
      if (groupJid) {
        await this.whatsapp.sendText(groupJid, preview);
      } else {
        await this.whatsapp.sendText("preview", preview);
      }
      const posted = await this.store.markPosted(id);
      if (!posted) {
        return { ok: false, reason: "missing", message: copy.errors.notFound };
      }
      log.info(`oferta ${id} aprovada (${wa.enabled ? "enviada" : "prévia"})`);
      return { ok: true, offer: posted, preview, sent: wa.enabled };
    } catch (err) {
      await this.store.markFailed(id, String(err));
      await this.store.restorePending(id);
      log.error("envio falhou", err);
      return { ok: false, reason: "send-failed", message: copy.errors.sendFailed };
    }
  }

  async reject(id: string): Promise<StoredOffer | undefined> {
    return this.store.markRejected(id);
  }
}
