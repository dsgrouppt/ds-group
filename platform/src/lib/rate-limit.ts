/**
 * Limitador de tentativas em memória — protege o login contra força
 * bruta num único processo. LIMITAÇÃO CONHECIDA: em produção com mais de
 * uma instância (ex.: várias funções serverless ou várias réplicas), cada
 * instância tem o seu próprio contador — não é uma proteção partilhada.
 * Para esse cenário, substituir por um limitador com estado partilhado
 * (Redis/Upstash) — a assinatura de `consume()` já foi pensada para isso,
 * é só trocar a implementação interna.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 5 * 60 * 1000; // 5 minutos
const MAX_ATTEMPTS = 8;

/** Devolve `true` se o pedido pode avançar; `false` se o limite foi excedido. */
export function consume(key: string, max = MAX_ATTEMPTS, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= max) {
    return false;
  }

  existing.count += 1;
  return true;
}

// Limpeza periódica para não acumular entradas indefinidamente em memória.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, WINDOW_MS).unref?.();
