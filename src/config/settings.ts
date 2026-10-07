import { join } from "node:path";
import { readJson, writeJson } from "../lib/json-file.ts";

export type AppSettings = {
  groupJid: string | undefined;
  groupName: string | undefined;
};

export class SettingsStore {
  private constructor(
    private readonly path: string,
    private data: AppSettings,
  ) {}

  static async open(dataDir: string, envGroupJid: string | undefined): Promise<SettingsStore> {
    const path = join(dataDir, "settings.json");
    const data = await readJson<AppSettings>(path, {
      groupJid: envGroupJid,
      groupName: undefined,
    });
    if (!data.groupJid && envGroupJid) data.groupJid = envGroupJid;
    return new SettingsStore(path, data);
  }

  get groupJid(): string | undefined {
    return this.data.groupJid;
  }

  get groupName(): string | undefined {
    return this.data.groupName;
  }

  snapshot(): AppSettings {
    return { ...this.data };
  }

  async setGroup(jid: string, name: string | undefined): Promise<void> {
    this.data.groupJid = jid;
    this.data.groupName = name;
    await writeJson(this.path, this.data);
  }
}
