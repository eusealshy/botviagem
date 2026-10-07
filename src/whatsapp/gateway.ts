export type WhatsAppGroup = {
  jid: string;
  name: string;
};

export type WhatsAppStatus = {
  enabled: boolean;
  connected: boolean;
  qrPath: string | undefined;
  userName: string | undefined;
};

export interface WhatsAppGateway {
  status(): WhatsAppStatus;
  start(): Promise<void>;
  listGroups(): Promise<WhatsAppGroup[]>;
  sendText(groupJid: string, text: string): Promise<void>;
}
