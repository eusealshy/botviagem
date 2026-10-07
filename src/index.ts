import { mkdir } from "node:fs/promises";
import { runCliApprove } from "./cli/approve.ts";
import { printOffers } from "./cli/print.ts";
import { loadConfig } from "./config/env.ts";
import { SettingsStore } from "./config/settings.ts";
import { copy } from "./copy/strings.ts";
import { log } from "./lib/log.ts";
import { OfferPipeline } from "./offers/pipeline.ts";
import { Publisher } from "./offers/publish.ts";
import { OfferStore } from "./offers/store.ts";
import { createSearchAdapter } from "./search/create.ts";
import { startScheduler } from "./scheduler/jobs.ts";
import { startWebServer } from "./web/server.ts";
import { createWhatsApp } from "./whatsapp/create.ts";

async function main(): Promise<void> {
  const config = loadConfig();
  await mkdir(config.dataDir, { recursive: true });

  const store = await OfferStore.open(config.dataDir);
  const settings = await SettingsStore.open(config.dataDir, config.whatsappGroupJid);
  const search = await createSearchAdapter(config);
  const pipeline = new OfferPipeline(config, store, search);
  const whatsapp = await createWhatsApp(config);
  const publisher = new Publisher(config, store, settings, whatsapp);

  console.log(copy.boot.title);
  if (config.searchAdapter === "mock") console.log(copy.boot.mockNote);
  console.log(copy.boot.nextChecks(config.checkHours.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ")));

  const queued = await pipeline.run();
  printOffers(queued);

  if (config.runOnce) {
    return;
  }

  if (!config.whatsappEnabled) console.log(copy.boot.whatsappOff);
  await whatsapp.start();
  startWebServer({ config, store, settings, publisher, pipeline, whatsapp });
  startScheduler(config, pipeline);

  if (config.cliApprove) {
    await runCliApprove(store, publisher);
  }
}

main().catch((err: unknown) => {
  log.error("falha na inicialização", err);
  process.exitCode = 1;
});
