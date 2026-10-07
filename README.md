# bot-viagens

Bot semi-automático de passagem barata para agência de turismo. Roda no PC da agência, busca tarifa promocional, espera alguém aprovar e só então manda no grupo de WhatsApp.

O destino não é uma lista fechada. As origens são São Paulo (GRU e CGH), Rio (GIG e SDU), Recife (REC) e Campinas (VCP). Quatro buscas por dia no horário de Brasília: 03:00, 09:00, 14:00 e 19:00.

## Aviso sobre WhatsApp e banimento

O envio usa [Baileys](https://github.com/WhiskeySockets/Baileys) (WhatsApp Web não oficial). Não usa a Cloud API da Meta.

Conta que dispara mensagem automática demais leva restrição ou ban. Use um número Business só para o bot, nunca o WhatsApp pessoal da agência. O teto padrão é 6 posts por dia. Se a Meta fechar a sessão, o QR volta a aparecer na pasta `data/`.

## O que o bot faz

1. Agenda as quatro buscas, inclusive a da madrugada.
2. Procura tarifa fora do normal a partir das origens acima.
3. Coloca o achado numa fila. Você aprova no navegador local ou no terminal.
4. Depois da aprovação, manda no grupo configurado.
5. No mesmo momento, se `WHATSAPP_ADMIN_JID` estiver preenchido, manda no PV da admin um resumo curto + link do Google Flights daquela oferta.
6. A mensagem do grupo segue o padrão da Carla: destino em caixa alta, preço, datas, trecho, direto/paradas, horários quando a oferta tiver, CTA no PV e aviso de tarifa. Sem o link.

```
🌴 CURITIBA | R$ 219

📅 11 → 16/11
✈️ CGH ⇄ Curitiba
⚡ Direto
🕐 08:20 → 09:25
🕐 18:40 → 19:45

💬 Quer fechar? Me chama no PV.

Valor sujeito a alteração até a emissão. Bagagem e assento conforme tarifa.
```

Horários só entram se a oferta trouxer ida e/ou volta. Sem horário, essas linhas somem — o bot não inventa.

O bot não publica sozinho no grupo de ofertas. Só depois de aprovar, e só se o teto do dia ainda não encheu.

## PV da admin (link Google Flights)

Prioridade: post no grupo + DM para a admin.

No `.env`, `WHATSAPP_ADMIN_JID` (JID de WhatsApp, tipo `5511…@s.whatsapp.net`). Quando uma oferta é aprovada e vai para o grupo, o bot também manda neste PV:

```
Postei no grupo.
Curitiba · R$ 219 · CGH ⇄ Curitiba · 11 → 16/11

https://www.google.com/travel/flights?hl=pt-BR&gl=BR&curr=BRL&q=...
```

O link é montado com origem, destino e datas da oferta (se a busca não trouxe um `deepLink` específico). Sem `WHATSAPP_ADMIN_JID`, só o grupo recebe.

## Chat “bot, voo mais barato…” (opcional / standby)

Caminho extra, não o fluxo principal. O bot pode responder no mesmo chat (PV ou grupo) a um pedido de voo mais barato. Grupo só se a mensagem **começar com `bot`**. Datas: um dia ou uma semana. Falta dado: uma pergunta curta.

Deixe de lado se o grupo + PV da admin já resolvem o dia a dia.

## Requisitos

- Node.js 20 ou mais novo
- Windows, macOS ou Linux
- Para WhatsApp: o app no celular (de preferência WhatsApp Business) para ler o QR
- Para busca real no Google Flights: Chromium via Playwright

## Instalação

```bash
cp .env.example .env
npm install
npm start
```

No Windows, o equivalente do `cp` é `copy .env.example .env`.

O padrão é `SEARCH_ADAPTER=mock`. Na primeira subida o bot imprime ofertas de exemplo no terminal e abre a tela de aprovação em [http://127.0.0.1:3847](http://127.0.0.1:3847).

Só a fila, sem ficar rodando:

```bash
npm run mock
```

## Fluxo QR → aprovar → grupo

1. No `.env`, `WHATSAPP_ENABLED=true`.
2. `npm start`. O QR aparece no terminal e em `data/whatsapp-qr.png` (a tela local também mostra a imagem).
3. No celular: WhatsApp Business → Aparelhos conectados → Conectar um aparelho.
4. A sessão fica em `data/whatsapp-auth/`. Nas próximas vezes não pede QR de novo, até a Meta derrubar a sessão.
5. Na tela local, escolha o grupo (ou preencha `WHATSAPP_GROUP_JID`, no formato `120363...@g.us`).
6. Aprove uma oferta. O bot manda o texto no grupo, se o teto do dia ainda não encheu.
7. Se `WHATSAPP_ADMIN_JID` estiver no `.env`, a admin recebe no PV o resumo + link do Google Flights.

Aprovação pelo terminal, na mesma máquina:

```bash
npm run approve
```

Responde `a` para aprovar, `p` para pular, `q` para sair.

## Configuração

Veja `.env.example`. Os campos que mais mudam no dia a dia:

| Variável | Função |
| --- | --- |
| `SEARCH_ADAPTER` | `mock`, `playwright` ou `api` |
| `WHATSAPP_ENABLED` | liga o Baileys |
| `WHATSAPP_GROUP_JID` | grupo de destino, se você já souber o JID |
| `WHATSAPP_ADMIN_JID` | PV da admin; recebe resumo + Google Flights após o post no grupo |
| `BRAND_NAME` | nome local da agência (não entra mais no texto do grupo) |
| `MAX_POSTS_PER_DAY` | teto de envios no dia (padrão 6) |
| `ORIGINS` | aeroportos de saída |
| `CHECK_HOURS` | horas das buscas em Brasília |
| `WEB_HOST` / `WEB_PORT` | tela local; deixe em `127.0.0.1` |

## Busca real

O buscador fica atrás de uma interface (`src/search/adapter.ts`). Trocar de mock para Google Flights ou API não mexe em aprovação nem no WhatsApp.

### Playwright (Google Flights)

```bash
npx playwright install chromium
```

No `.env`: `SEARCH_ADAPTER=playwright`. O scraper lê a página de explorar destinos. Seletor do Google muda, CAPTCHA aparece, e nisso a rodada volta vazia em vez de quebrar o bot. Isso é mais estável no PC da agência do que em servidor.

Cada horário da madrugada/manhã/tarde/noite busca um par de origens, para não abrir seis Chromiums de uma vez.

### API

`SEARCH_ADAPTER=api` e `FLIGHT_API_URL` apontando para um GET que recebe `origin` e `currency=BRL`. Resposta:

```json
{
  "offers": [
    {
      "originCode": "GRU",
      "originCity": "São Paulo",
      "destinationCode": "REC",
      "destinationCity": "Recife",
      "departDate": "2026-11-12",
      "returnDate": "2026-11-18",
      "priceBRL": 389,
      "airline": "Azul",
      "stops": 0,
      "outboundTimes": { "depart": "08:20", "arrive": "09:25" },
      "returnTimes": { "depart": "18:40", "arrive": "19:45" },
      "deepLink": "https://www.google.com/travel/flights"
    }
  ]
}
```

`FLIGHT_API_KEY` vira `Authorization: Bearer ...` se preenchida.

Ofertas já vistas (mesmo trecho e faixa de preço) ficam 14 dias em `data/offers.json` para não encher a fila de repetido.

## Pastas

```
src/config      .env, origens, grupo salvo
src/search      adapter de busca (mock, Playwright, API) e parser do chat
src/offers      fila, ranking, texto da mensagem, link Google Flights
src/whatsapp    Baileys, inbound do chat, QR em disco, teto diário
src/web         tela local de aprovação
src/scheduler   cron 03:00 / 09:00 / 14:00 / 19:00
src/copy        textos em pt-BR
src/cli         impressão e aprovação no terminal
```

## Comandos

```bash
npm start       # bot completo
npm run mock    # uma busca de exemplo e sai
npm run approve # fila no terminal
npm test
npm run typecheck
```

Textos de oferta, tela e terminal seguem o guia [humanizer](https://github.com/blader/humanizer): frase direta, sem abertura de palco e sem bordão de modelo.
