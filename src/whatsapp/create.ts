import { join } from "node:path";
import type { Config } from "../config/env.ts";
import { DisabledWhatsApp } from "./disabled.ts";
import type { WhatsAppGateway } from "./gateway.ts";

export async function createWhatsApp(config: Config): Promise<WhatsAppGateway> {
  if (!config.whatsappEnabled) {
    return new DisabledWhatsApp();
  }
  const { BaileysWhatsApp } = await import("./baileys.ts");
  return new BaileysWhatsApp(config.dataDir, join(config.dataDir, "whatsapp-auth"));
}
