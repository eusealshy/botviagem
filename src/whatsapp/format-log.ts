// Baileys uses a Pino-shaped logger: error(obj, msg?). String(obj) is
// "[object Object]", which hid the message in the second arg and any stack
// on err/error/trace.
export function formatBaileysLog(args: readonly unknown[]): string | undefined {
  const head = args[0];
  if (!head) return undefined;
  if (typeof head === "string") return head;

  const note = typeof args[1] === "string" && args[1] ? args[1] : undefined;
  return joinCause(note, causeText(head)) ?? safeString(head);
}

function causeText(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined;
  if (value instanceof Error) return value.stack || value.message || undefined;
  if (typeof value !== "object" || value === null) return undefined;

  const record = value as Record<string, unknown>;
  const direct = joinCause(
    typeof record.message === "string" ? record.message : undefined,
    typeof record.stack === "string" ? record.stack : undefined,
  );
  const nested = record.err ?? record.error;
  const fromNested = nested !== undefined && nested !== value ? causeText(nested) : undefined;
  const trace = typeof record.trace === "string" ? record.trace : undefined;
  return joinCause(joinCause(direct, fromNested), trace);
}

function joinCause(left: string | undefined, right: string | undefined): string | undefined {
  if (!left) return right;
  if (!right) return left;
  if (covers(left, right)) return left;
  if (covers(right, left)) return right;
  return `${left}\n${right}`;
}

function covers(container: string, text: string): boolean {
  if (container === text) return true;
  const first = container.split("\n")[0] ?? container;
  return first === text || first.endsWith(`: ${text}`);
}

function safeString(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    if (typeof json === "string") return json;
  } catch {
    // circular structures fall through
  }
  const text = String(value);
  return text === "[object Object]" ? "{}" : text;
}
