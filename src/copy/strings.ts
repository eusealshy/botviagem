/**
 * User-facing copy. Voice: Brazilian travel-agency WhatsApp groups
 * and a colleague explaining the local tool. Written against
 * https://github.com/blader/humanizer (plain claims, no staged openers,
 * no not-X-but-Y, no one-line closers, no em dashes).
 */
export const copy = {
  boot: {
    title: "bot-viagens",
    mockNote: "modo mock: ofertas de exemplo, sem Google Flights.",
    approvalUrl: (url: string) => `tela de aprovação: ${url}`,
    nextChecks: (hours: string) => `próximas buscas: ${hours} (Brasília)`,
    qrFile: (path: string) => `QR do WhatsApp salvo em ${path}`,
    qrScan: "abre o WhatsApp Business → Aparelhos conectados → Conectar um aparelho, e lê o QR.",
    whatsappOff:
      "WhatsApp desligado. As ofertas aparecem aqui e na tela local; nada vai para grupo.",
  },
  cli: {
    empty: "Nenhuma oferta esperando aprovação.",
    intro: (count: number) =>
      count === 1
        ? "Tem 1 oferta na fila. Se o preço fizer sentido para o grupo, aprova."
        : `Tem ${count} ofertas na fila. Se o preço fizer sentido para o grupo, aprova.`,
    prompt: "a = aprovar · p = pular · q = sair",
    invalid: "Não entendi. Usa a, p ou q.",
    skipped: "Pulei essa.",
    rateLimited: (max: number) =>
      `Já foram ${max} posts hoje. Essa fica na fila até amanhã.`,
    posted: "Enviei no grupo.",
    previewOnly: "WhatsApp está desligado, então só mostrei a mensagem abaixo.",
    bye: "Beleza, paro por aqui. A fila continua na tela local.",
  },
  ui: {
    title: "bot-viagens",
    subtitle: "Ofertas achadas nas buscas. Nada vai para o grupo sem você aprovar.",
    pending: "Na fila",
    empty: "Fila vazia. As buscas rodam 03:00, 09:00, 14:00 e 19:00 (Brasília), ou clique em buscar agora.",
    searchNow: "Buscar agora",
    searching: "Buscando…",
    approve: "Aprovar e enviar",
    skip: "Pular",
    preview: "Como fica no grupo",
    group: "Grupo",
    groupHelp: "Depois do QR, a lista de grupos aparece aqui.",
    saveGroup: "Usar este grupo",
    waOff: "WhatsApp desligado neste .env. Aprovar só gera a prévia no log.",
    waWait: "Esperando o QR. O arquivo também está na pasta data.",
    waOk: "WhatsApp conectado ({name})",
    postedToday: "{count} de {max} posts hoje",
    recent: "Enviadas hoje",
    noRecent: "Nada enviado hoje.",
    footer:
      "Roda só neste PC. Use um número Business separado; o WhatsApp Web não oficial leva ban se disparar demais.",
  },
  errors: {
    noGroup: "Escolhe o grupo na tela (ou no WHATSAPP_GROUP_JID) antes de enviar.",
    notConnected: "WhatsApp ainda não conectou. Lê o QR e tenta de novo.",
    sendFailed: "O envio falhou. A oferta continua na fila.",
    notFound: "Essa oferta não está mais na fila.",
    searchFailed: "A busca falhou. Olha o log no terminal.",
  },
  cta: "💬 Quer fechar? Me chama no PV.",
  disclaimer:
    "Valor sujeito a alteração até a emissão. Bagagem e assento conforme tarifa.",
} as const;
