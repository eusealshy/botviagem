import { mkdir, rm, unlink } from "node:fs/promises";
import { join } from "node:path";
import QRCode from "qrcode";
import qrcodeTerminal from "qrcode-terminal";
import { copy } from "../copy/strings.ts";
import { delay } from "../lib/delay.ts";
import { log } from "../lib/log.ts";
import type {
  InboundHandler,
  IncomingChat,
  WhatsAppGateway,
  WhatsAppGroup,
  WhatsAppStatus,
} from "./gateway.ts";

type BaileysSocket = {
  ev: {
    on: (event: string, cb: (value: never) => void | Promise<void>) => void;
  };
  user?: { id?: string; name?: string };
  groupFetchAllParticipating: () => Promise<Record<string, { id: string; subject?: string }>>;
  sendMessage: (jid: string, content: { text: string }) => Promise<unknown>;
};

type DisconnectStatus = { error?: { output?: { statusCode?: number } } };

const LOGGED_OUT = 401;

type BaileysIncoming = {
  key?: { id?: string; remoteJid?: string; fromMe?: boolean };
  message?: BaileysContent;
};

type BaileysContent = {
  conversation?: string;
  extendedTextMessage?: { text?: string };
  ephemeralMessage?: { message?: BaileysContent };
};

export class BaileysWhatsApp implements WhatsAppGateway {
  private sock: BaileysSocket | undefined;
  private connected = false;
  private qrPath: string | undefined;
  private userName: string | undefined;
  private starting = false;
  private inbound: InboundHandler | undefined;

  constructor(
    private readonly dataDir: string,
    private readonly authDir: string,
  ) {}

  status(): WhatsAppStatus {
    return {
      enabled: true,
      connected: this.connected,
      qrPath: this.qrPath,
      userName: this.userName,
    };
  }

  async start(): Promise<void> {
    if (this.starting || this.connected) return;
    this.starting = true;
    await mkdir(this.authDir, { recursive: true });
    await this.connect();
  }

  async listGroups(): Promise<WhatsAppGroup[]> {
    if (!this.sock || !this.connected) return [];
    const groups = await this.sock.groupFetchAllParticipating();
    return Object.values(groups).map((group) => ({
      jid: group.id,
      name: group.subject ?? group.id,
    }));
  }

  async sendText(chatJid: string, text: string): Promise<void> {
    if (!this.sock || !this.connected) {
      throw new Error(copy.errors.notConnected);
    }
    await this.sock.sendMessage(chatJid, { text });
  }

  setInboundHandler(handler: InboundHandler | undefined): void {
    this.inbound = handler;
  }

  private async connect(): Promise<void> {
    const baileys = await import("@whiskeysockets/baileys");
    const { state, saveCreds } = await baileys.useMultiFileAuthState(this.authDir);
    const { version } = await baileys.fetchLatestBaileysVersion();

    const makeWASocket = baileys.default ?? baileys.makeWASocket;
    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: baileys.makeCacheableSignalKeyStore(state.keys, silentLogger()),
      },
      printQRInTerminal: false,
      browser: baileys.Browsers.ubuntu("Chrome"),
      logger: silentLogger(),
    }) as unknown as BaileysSocket;

    this.sock = sock;

    sock.ev.on("creds.update", (async () => {
      await saveCreds();
    }) as never);

    sock.ev.on("messages.upsert", ((upsert: { messages?: BaileysIncoming[] }) => {
      void this.dispatchInbound(upsert.messages ?? []);
    }) as never);

    sock.ev.on("connection.update", (async (update: {
      connection?: string;
      lastDisconnect?: DisconnectStatus;
      qr?: string;
    }) => {
      if (update.qr) {
        await this.persistQr(update.qr);
      }
      if (update.connection === "open") {
        this.connected = true;
        this.starting = false;
        this.userName = sock.user?.name ?? sock.user?.id ?? "ok";
        await this.clearQr();
        log.info(`WhatsApp conectado (${this.userName})`);
      }
      if (update.connection === "close") {
        this.connected = false;
        this.starting = false;
        const code = update.lastDisconnect?.error?.output?.statusCode;
        if (code === LOGGED_OUT || code === baileys.DisconnectReason.loggedOut) {
          log.warn("sessão do WhatsApp caiu. apaga data/whatsapp-auth se o QR não aparecer e sobe de novo.");
          await rm(this.authDir, { recursive: true, force: true });
          await delay(1500);
          await this.start();
          return;
        }
        log.warn("WhatsApp desconectou, tentando de novo");
        await delay(2000);
        await this.start();
      }
    }) as never);
  }

  private async dispatchInbound(messages: BaileysIncoming[]): Promise<void> {
    const handler = this.inbound;
    if (!handler) return;
    for (const raw of messages) {
      const incoming = toIncomingChat(raw);
      if (!incoming) continue;
      try {
        await handler(incoming);
      } catch (err) {
        log.warn("inbound WhatsApp falhou", err);
      }
    }
  }

  private async persistQr(qr: string): Promise<void> {
    const path = join(this.dataDir, "whatsapp-qr.png");
    await mkdir(this.dataDir, { recursive: true });
    await QRCode.toFile(path, qr, { width: 360, margin: 2 });
    this.qrPath = path;
    qrcodeTerminal.generate(qr, { small: true });
    log.info(copy.boot.qrFile(path));
    log.info(copy.boot.qrScan);
  }

  private async clearQr(): Promise<void> {
    if (!this.qrPath) return;
    await unlink(this.qrPath).catch(() => undefined);
    this.qrPath = undefined;
  }
}

function toIncomingChat(raw: BaileysIncoming): IncomingChat | undefined {
  const jid = raw.key?.remoteJid;
  if (!jid || jid === "status@broadcast") return undefined;
  const text = extractText(raw.message);
  if (!text) return undefined;
  return {
    id: raw.key?.id ?? `${jid}:${text.slice(0, 24)}`,
    jid,
    isGroup: jid.endsWith("@g.us"),
    text,
    fromMe: Boolean(raw.key?.fromMe),
  };
}

function extractText(message: BaileysContent | undefined): string | undefined {
  if (!message) return undefined;
  if (message.conversation?.trim()) return message.conversation;
  if (message.extendedTextMessage?.text?.trim()) return message.extendedTextMessage.text;
  if (message.ephemeralMessage?.message) return extractText(message.ephemeralMessage.message);
  return undefined;
}

function silentLogger(): {
  level: string;
  child: () => ReturnType<typeof silentLogger>;
  trace: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  fatal: (...args: unknown[]) => void;
} {
  const logger = {
    level: "silent",
    child: () => logger,
    trace: () => undefined,
    debug: () => undefined,
    info: () => undefined,
    warn: (...args: unknown[]) => emitBaileysLog("warn", args),
    error: (...args: unknown[]) => emitBaileysLog("error", args),
    fatal: (...args: unknown[]) => emitBaileysLog("error", args),
  };
  return logger;
}

function emitBaileysLog(level: "warn" | "error", args: readonly unknown[]): void {
  const line = formatBaileysLog(args);
  if (line) log[level](line);
}

// Pino style is log(obj, msg). String(obj) is "[object Object]" and drops msg and stack.
export function formatBaileysLog(args: readonly unknown[]): string | undefined {
  const head = args[0];
  if (!head) return undefined;
  if (typeof head === "string") return head;

  const message = typeof args[1] === "string" && args[1] ? args[1] : undefined;
  if (typeof head !== "object") return joinLog(message, String(head));

  const record = head as Record<string, unknown>;
  const nested = joinLog(
    describeLogValue(record.err),
    describeLogValue(record.error),
    describeLogValue(record.trace),
  );
  const self = nested ? undefined : describeLogValue(head);
  return joinLog(message, nested, self);
}

function joinLog(...parts: Array<string | undefined>): string | undefined {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const part of parts) {
    if (!part || seen.has(part)) continue;
    seen.add(part);
    lines.push(part);
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
}

function describeLogValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const text = value.trim();
    return text || undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (!value || typeof value !== "object") return undefined;

  const record = value as { message?: unknown; stack?: unknown };
  const message = typeof record.message === "string" && record.message.trim() ? record.message : undefined;
  const stack = typeof record.stack === "string" && record.stack.trim() ? record.stack : undefined;
  if (stack && message && !stack.includes(message)) return `${message}\n${stack}`;
  return stack ?? message;
}
