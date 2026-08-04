/**
 * Logging estruturado mínimo — sem dependência nova, escreve para stdout/
 * stderr em JSON (formato que qualquer serviço de logs gerido, Vercel/
 * Railway/CloudWatch, consegue indexar e pesquisar). Substituir por um
 * serviço dedicado (Sentry, Axiom, Datadog) é uma troca isolada a este
 * ficheiro — nenhum ponto de chamada muda.
 */

type Level = "info" | "warn" | "error";

function write(level: Level, event: string, meta?: Record<string, unknown>) {
  const line = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...meta,
  };

  const serialized = JSON.stringify(line);
  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

export const logger = {
  info: (event: string, meta?: Record<string, unknown>) => write("info", event, meta),
  warn: (event: string, meta?: Record<string, unknown>) => write("warn", event, meta),
  error: (event: string, meta?: Record<string, unknown>) => write("error", event, meta),
};
