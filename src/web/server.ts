import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { copy } from "../copy/strings.ts";
import type { Config } from "../config/env.ts";
import type { SettingsStore } from "../config/settings.ts";
import { log } from "../lib/log.ts";
import type { OfferPipeline } from "../offers/pipeline.ts";
import type { Publisher } from "../offers/publish.ts";
import type { OfferStore } from "../offers/store.ts";
import type { WhatsAppGateway } from "../whatsapp/gateway.ts";
import { renderPage } from "./page.ts";

export type WebContext = {
  config: Config;
  store: OfferStore;
  settings: SettingsStore;
  publisher: Publisher;
  pipeline: OfferPipeline;
  whatsapp: WhatsAppGateway;
};

export function startWebServer(ctx: WebContext): Server {
  const server = createServer((req, res) => {
    void handle(ctx, req, res);
  });
  server.listen(ctx.config.webPort, ctx.config.webHost, () => {
    log.info(copy.boot.approvalUrl(`http://${ctx.config.webHost}:${ctx.config.webPort}`));
  });
  return server;
}

async function handle(ctx: WebContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${ctx.config.webHost}`);
  try {
    if (req.method === "GET" && url.pathname === "/") {
      html(res, renderPage());
      return;
    }
    if (req.method === "GET" && url.pathname === "/qr.png") {
      await sendQr(ctx, res);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/state") {
      json(res, 200, await buildState(ctx));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/search-now") {
      const queued = await ctx.pipeline.run();
      json(res, 200, { queued: queued.length });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/group") {
      const body = await readJsonBody(req);
      const jid = String(body.jid ?? "");
      if (!jid) {
        json(res, 400, { message: copy.errors.noGroup });
        return;
      }
      await ctx.settings.setGroup(jid, body.name ? String(body.name) : undefined);
      json(res, 200, { ok: true });
      return;
    }
    const approve = url.pathname.match(/^\/api\/offers\/([^/]+)\/approve$/);
    if (req.method === "POST" && approve?.[1]) {
      const result = await ctx.publisher.approve(approve[1]);
      json(res, result.ok ? 200 : 400, result.ok ? result : { message: result.message });
      return;
    }
    const reject = url.pathname.match(/^\/api\/offers\/([^/]+)\/reject$/);
    if (req.method === "POST" && reject?.[1]) {
      const offer = await ctx.publisher.reject(reject[1]);
      json(res, offer ? 200 : 404, offer ? { ok: true } : { message: copy.errors.notFound });
      return;
    }
    json(res, 404, { message: "not found" });
  } catch (err) {
    log.error("web", err);
    json(res, 500, { message: copy.errors.searchFailed });
  }
}

async function buildState(ctx: WebContext) {
  const wa = ctx.whatsapp.status();
  const groups = wa.connected ? await ctx.whatsapp.listGroups() : [];
  return {
    whatsapp: {
      enabled: wa.enabled,
      connected: wa.connected,
      qrReady: Boolean(wa.qrPath),
      userName: wa.userName,
    },
    groupJid: ctx.settings.groupJid ?? ctx.config.whatsappGroupJid ?? "",
    groupName: ctx.settings.groupName ?? "",
    groups,
    postedToday: ctx.publisher.postedToday(),
    maxPosts: ctx.config.maxPostsPerDay,
    pending: ctx.store.pending().map((offer) => ({
      offer,
      message: ctx.publisher.preview(offer),
    })),
    recent: ctx.store.recentlyPosted(),
  };
}

async function sendQr(ctx: WebContext, res: ServerResponse): Promise<void> {
  const path = ctx.whatsapp.status().qrPath;
  if (!path) {
    res.writeHead(404);
    res.end();
    return;
  }
  const buf = await readFile(path);
  res.writeHead(200, { "content-type": "image/png", "cache-control": "no-store" });
  res.end(buf);
}

function html(res: ServerResponse, body: string): void {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(body);
}

function json(res: ServerResponse, status: number, body: unknown): Promise<void> {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
  return Promise.resolve();
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}
