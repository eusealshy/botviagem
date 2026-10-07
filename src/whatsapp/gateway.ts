export type IncomingChat = {
  id: string;
  jid: string;
  isGroup: boolean;
  text: string;
  fromMe: boolean;
};

export type InboundHandler = (msg: IncomingChat) => Promise<void>;

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
  sendText(chatJid: string, text: string): Promise<void>;
  setInboundHandler(handler: InboundHandler | undefined): void;
}
