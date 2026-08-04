/**
 * Helpers de formatação partilhados — pt-PT.
 *
 * Extraído porque `formatEuro` estava duplicado (copy-paste) em 4
 * ficheiros de página (dashboard, financeiro, financeiro/[id], obras/[id]),
 * com o risco de divergirem silenciosamente (ex.: um alterar arredondamento
 * e outro não). Fonte única aqui.
 */

export function formatEuro(value: number, options?: { decimals?: number }): string {
  const maximumFractionDigits = options?.decimals ?? 0;
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  }).format(value);
}

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("pt-PT");
}

export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
