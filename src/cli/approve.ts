import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { copy } from "../copy/strings.ts";
import { formatPtDate } from "../lib/clock.ts";
import { log } from "../lib/log.ts";
import type { Publisher } from "../offers/publish.ts";
import type { OfferStore } from "../offers/store.ts";
import { formatBRL } from "../offers/template.ts";

export async function runCliApprove(store: OfferStore, publisher: Publisher): Promise<void> {
  const pending = store.pending();
  if (pending.length === 0) {
    console.log(copy.cli.empty);
    return;
  }

  console.log(copy.cli.intro(pending.length));
  const rl = createInterface({ input, output });
  try {
    for (const offer of pending) {
      console.log(
        `\n${offer.origin.code} → ${offer.destination.city} · ${formatPtDate(offer.departDate)} a ${formatPtDate(offer.returnDate)} · ${formatBRL(offer.priceBRL)}`,
      );
      console.log(publisher.preview(offer));
      const answer = (await rl.question(`\n${copy.cli.prompt}\n`)).trim().toLowerCase();
      if (answer === "q" || answer === "sair") {
        console.log(copy.cli.bye);
        return;
      }
      if (answer === "p" || answer === "pular") {
        await publisher.reject(offer.id);
        console.log(copy.cli.skipped);
        continue;
      }
      if (answer === "a" || answer === "aprovar") {
        const result = await publisher.approve(offer.id);
        if (!result.ok) {
          console.log(result.message);
          continue;
        }
        console.log(result.sent ? copy.cli.posted : copy.cli.previewOnly);
        continue;
      }
      console.log(copy.cli.invalid);
    }
  } finally {
    rl.close();
  }
  log.debug("cli de aprovação encerrou");
}
