import { log } from "../lib/log.ts";
import type { InboundHandler, WhatsAppGateway, WhatsAppGroup, WhatsAppStatus } from "./gateway.ts";

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

  async sendText(_chatJid: string, text: string): Promise<void> {
    log.info("prévia da mensagem (WhatsApp desligado):\n" + text);
  }

  setInboundHandler(_handler: InboundHandler | undefined): void {
    // WhatsApp off: nothing to listen to.
  }
}
