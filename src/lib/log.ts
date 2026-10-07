type Level = "debug" | "info" | "warn" | "error";

const order: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minLevel: Level = process.env.LOG_LEVEL === "debug" ? "debug" : "info";

function stamp(): string {
  return new Date().toISOString();
}

function write(level: Level, message: string, extra?: unknown): void {
  if (order[level] < order[minLevel]) return;
  const line = `${stamp()} ${level.padEnd(5)} ${message}`;
  if (extra === undefined) {
    console.log(line);
    return;
  }
  console.log(line, extra);
}

export const log = {
  debug: (message: string, extra?: unknown) => write("debug", message, extra),
  info: (message: string, extra?: unknown) => write("info", message, extra),
  warn: (message: string, extra?: unknown) => write("warn", message, extra),
  error: (message: string, extra?: unknown) => write("error", message, extra),
};
