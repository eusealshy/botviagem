import { Cron } from "croner";
import type { Config } from "../config/env.ts";
import { hourInZone } from "../lib/clock.ts";
import { log } from "../lib/log.ts";
import type { OfferPipeline } from "../offers/pipeline.ts";

export function startScheduler(config: Config, pipeline: OfferPipeline): Cron {
  const hours = config.checkHours.join(",");
  const pattern = `0 ${hours} * * *`;
  log.info(`agenda: ${pattern} (${config.timezone})`);

  return new Cron(
    pattern,
    { timezone: config.timezone, protect: true },
    () => {
      const hour = hourInZone(new Date(), config.timezone);
      const origins = originsForRun(config, hour);
      log.info(`rodada das ${String(hour).padStart(2, "0")}:00, origens ${origins.join(", ")}`);
      void pipeline.run(origins).catch((err: unknown) => log.error("rodada falhou", err));
    },
  );
}

export function originsForRun(config: Config, hour: number): string[] {
  if (config.searchAdapter === "mock") return config.origins;
  const slots: string[][] = [
    ["GRU", "CGH"],
    ["GIG", "SDU"],
    ["REC", "VCP"],
    ["GRU", "GIG", "REC"],
  ];
  const index = config.checkHours.indexOf(hour);
  const slot = slots[(index >= 0 ? index : 0) % slots.length] ?? slots[0];
  const picked = config.origins.filter((code) => slot?.includes(code));
  return picked.length > 0 ? picked : config.origins.slice(0, 2);
}
