import assert from "node:assert/strict";
import test from "node:test";
import type { Config } from "../config/env.ts";
import type { SettingsStore } from "../config/settings.ts";
import type { InboundHandler, WhatsAppGateway, WhatsAppGroup, WhatsAppStatus } from "../whatsapp/gateway.ts";
import { formatOfferMessage } from "./template.ts";
import { Publisher } from "./publish.ts";
import type { OfferStore } from "./store.ts";
import type { StoredOffer } from "./types.ts";

const GROUP = "120363ofertas@g.us";
const ADMIN = "5511999999999@s.whatsapp.net";

function stored(extra: Partial<StoredOffer> = {}): StoredOffer {
  return {
    id: "off1",
    fingerprint: "fp",
    origin: { code: "CGH", city: "São Paulo" },
    destination: { code: "CWB", city: "Curitiba" },
    departDate: "2026-11-11",
    returnDate: "2026-11-16",
    priceBRL: 219,
    airline: "Azul",
    stops: 0,
    outboundTimes: undefined,
    returnTimes: undefined,
    source: "mock",
    foundAt: "2026-10-07T12:00:00.000Z",
    deepLink: undefined,
    promoScore: 0.4,
    status: "pending",
    queuedAt: "2026-10-07T12:00:00.000Z",
    decidedAt: undefined,
    postedAt: undefined,
    error: undefined,
    ...extra,
  };
}

function config(extra: Partial<Config> = {}): Config {
  return {
    timezone: "America/Sao_Paulo",
    checkHours: [9],
    maxPostsPerDay: 6,
    origins: ["CGH"],
    brandName: "Agência",
    searchAdapter: "mock",
    flightApiUrl: undefined,
    flightApiKey: undefined,
    playwrightHeadless: true,
    whatsappEnabled: true,
    whatsappGroupJid: GROUP,
    whatsappAdminJid: ADMIN,
    dataDir: "./data",
    webHost: "127.0.0.1",
    webPort: 3847,
    runOnce: false,
    cliApprove: false,
    ...extra,
  };
}

class FakeWa implements WhatsAppGateway {
  readonly sent: { jid: string; text: string }[] = [];
  failAdmin = false;

  constructor(private readonly enabled = true) {}

  status(): WhatsAppStatus {
    return { enabled: this.enabled, connected: this.enabled, qrPath: undefined, userName: "bot" };
  }
  async start(): Promise<void> {}
  async listGroups(): Promise<WhatsAppGroup[]> {
    return [];
  }
  async sendText(chatJid: string, text: string): Promise<void> {
    if (this.failAdmin && chatJid === ADMIN) throw new Error("dm fail");
    this.sent.push({ jid: chatJid, text });
  }
  setInboundHandler(_handler: InboundHandler | undefined): void {}
}

function fakeStore(offer: StoredOffer): OfferStore {
  const data = { offer };
  return {
    byId: (id: string) => (id === data.offer.id ? data.offer : undefined),
    postedOn: () => [],
    markPosted: async (id: string) => {
      if (id !== data.offer.id) return undefined;
      data.offer = { ...data.offer, status: "posted", postedAt: new Date().toISOString() };
      return data.offer;
    },
    markFailed: async () => undefined,
    restorePending: async () => undefined,
  } as unknown as OfferStore;
}

function settings(groupJid: string | undefined): SettingsStore {
  return { groupJid } as SettingsStore;
}

test("post no grupo usa o template; admin recebe resumo + Google Flights", async () => {
  const offer = stored();
  const wa = new FakeWa();
  const publisher = new Publisher(config(), fakeStore(offer), settings(GROUP), wa);
  const result = await publisher.approve("off1");
  assert.equal(result.ok, true);
  assert.equal(wa.sent.length, 2);
  const groupMsg = wa.sent[0];
  const adminMsg = wa.sent[1];
  assert.ok(groupMsg && adminMsg);
  assert.equal(groupMsg.jid, GROUP);
  assert.equal(groupMsg.text, formatOfferMessage(offer));
  assert.doesNotMatch(groupMsg.text, /google\.com\/travel\/flights/);
  assert.equal(adminMsg.jid, ADMIN);
  assert.match(adminMsg.text, /Postei no grupo/);
  assert.match(adminMsg.text, /Curitiba · R\$ 219/);
  assert.match(adminMsg.text, /https:\/\/www\.google\.com\/travel\/flights/);
  assert.match(adminMsg.text, /CGH/);
  assert.match(adminMsg.text, /CWB/);
});

test("sem WHATSAPP_ADMIN_JID não manda PV", async () => {
  const wa = new FakeWa();
  const publisher = new Publisher(
    config({ whatsappAdminJid: undefined }),
    fakeStore(stored()),
    settings(GROUP),
    wa,
  );
  const result = await publisher.approve("off1");
  assert.equal(result.ok, true);
  assert.equal(wa.sent.length, 1);
  assert.equal(wa.sent[0]?.jid, GROUP);
});

test("falha no DM da admin não desfaz o post do grupo", async () => {
  const wa = new FakeWa();
  wa.failAdmin = true;
  const publisher = new Publisher(config(), fakeStore(stored()), settings(GROUP), wa);
  const result = await publisher.approve("off1");
  assert.equal(result.ok, true);
  assert.equal(wa.sent.length, 1);
  assert.equal(wa.sent[0]?.jid, GROUP);
});
