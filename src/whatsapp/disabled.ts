import { log } from "../lib/log.ts";
import type { WhatsAppGateway, WhatsAppGroup, WhatsAppStatus } from "./gateway.ts";

export class DisabledWhatsApp implements WhatsAppGateway {
  status(): WhatsAppStatus {
    return {
      enabled: false,
      connected: false,
      qrPath: undefined,
      userName: undefined,
    };
  }

  async start(): Promise<void> {
    log.info("WhatsApp desligado (WHATSAPP_ENABLED=false)");
  }

  async listGroups(): Promise<WhatsAppGroup[]> {
    return [];
  }

  async sendText(_groupJid: string, text: string): Promise<void> {
    log.info("prévia da mensagem (WhatsApp desligado):\n" + text);
  }
}
