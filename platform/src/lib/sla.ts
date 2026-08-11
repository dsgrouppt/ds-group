import { BUSINESS_HOURS, SLA_FIRST_CONTACT_MINUTES_IN_HOURS, SLA_FIRST_CONTACT_MINUTES_OUT_OF_HOURS } from "./business-rules";

function getLisbonParts(date: Date): { weekday: string; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_HOURS.timeZone,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  // "hour12: false" à meia-noite pode devolver "24" em vez de "0" em alguns
  // motores ICU — normalizado aqui para não desalinhar a comparação de hora.
  const rawHour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const hour = rawHour === 24 ? 0 : rawHour;
  return { weekday, hour };
}

/**
 * Horário comercial aprovado: Segunda a sexta, 09:00–19:00 (Europe/Lisbon).
 * Ver docs/05_Processo_Comercial_Operacional_DS.md §2 e a decisão de
 * negócio já fechada ("Horário comercial") na missão CTO.
 */
export function isWithinBusinessHours(date: Date): boolean {
  const { weekday, hour } = getLisbonParts(date);
  return BUSINESS_HOURS.days.has(weekday) && hour >= BUSINESS_HOURS.startHour && hour < BUSINESS_HOURS.endHour;
}

/**
 * Prazo da tarefa "Primeiro Contacto" (doc 05 §2 + SLA de resposta já
 * aprovado): 15 min dentro do horário comercial, 2h fora dele.
 *
 * Nota de implementação: o doc 05 propõe também, sem confirmação explícita
 * ("[DECISÃO NECESSÁRIA]"), um refinamento para leads fora de horário —
 * "contacto até às 10h do dia útil seguinte" em vez de "+2h" cru (que numa
 * entrada ao sábado de manhã daria prazo ainda dentro do fim de semana).
 * A decisão de negócio já aprovada na missão CTO é literal e mais simples
 * ("até 2 horas fora do horário comercial"), sem essa exceção — é essa que
 * está implementada aqui. Se o Diogo preferir o refinamento do doc 05,
 * é uma alteração pequena e isolada a esta função.
 */
export function firstContactDueAt(createdAt: Date): Date {
  const minutes = isWithinBusinessHours(createdAt)
    ? SLA_FIRST_CONTACT_MINUTES_IN_HOURS
    : SLA_FIRST_CONTACT_MINUTES_OUT_OF_HOURS;
  return new Date(createdAt.getTime() + minutes * 60_000);
}
