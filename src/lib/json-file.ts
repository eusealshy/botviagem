import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return fallback;
    throw err;
  }
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmp, path);
}
