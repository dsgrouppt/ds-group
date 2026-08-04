export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Formata um valor de estatística; devolve travessão quando ainda não há dado real. */
export function formatStat(value: string | null, suffix = ""): string {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}${suffix}`;
}


/** Data por extenso em português — usada nos artigos de blog (lançamento e índice). */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}
