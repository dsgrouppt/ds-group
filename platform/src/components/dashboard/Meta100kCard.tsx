import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatEuro } from "@/lib/format";

/**
 * Cartão "Meta 100k" — acompanha a meta de faturação adjudicada (sem IVA).
 * Fonte: negócios do CRM. Conta um negócio quando está em "Fechado — Ganho"
 * (inclui obras em curso/concluídas) e a data de adjudicação (primeiro
 * ActivityLog stage=FECHADO_GANHO) é >= início da meta.
 * Parâmetros da meta: variáveis de ambiente opcionais META_100K_VALOR,
 * META_100K_INICIO (AAAA-MM) e META_100K_MESES; por omissão 100000 / 2026-10 / 12.
 */

const GOAL = Number(process.env.META_100K_VALOR) || 100000;
const START = process.env.META_100K_INICIO || "2026-10";
const MONTHS = Number(process.env.META_100K_MESES) || 12;
const CLOSE_RATE_ONE_IN = 5;

export async function Meta100kCard() {
  const [sy, sm] = START.split("-").map(Number);
  const startDate = new Date(Date.UTC(sy, (sm || 1) - 1, 1));
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [wonDeals, wonLogs, pendingDeals] = await Promise.all([
    prisma.deal.findMany({ where: { stage: "FECHADO_GANHO" }, select: { id: true, amount: true } }),
    prisma.activityLog.findMany({
      where: { entity: "Deal", action: "STAGE_CHANGE", meta: "stage=FECHADO_GANHO" },
      select: { entityId: true, createdAt: true },
    }),
    prisma.deal.findMany({
      where: { stage: { in: ["PROPOSTA_ENVIADA", "EM_NEGOCIACAO"] } },
      select: { amount: true },
    }),
  ]);

  const adjDate = new Map<string, Date>();
  for (const l of wonLogs) {
    if (!l.entityId) continue;
    const d = adjDate.get(l.entityId);
    if (!d || l.createdAt < d) adjDate.set(l.entityId, l.createdAt);
  }

  let adjudicated = 0;
  let thisMonth = 0;
  const wonAmounts: number[] = [];
  for (const d of wonDeals) {
    const when = adjDate.get(d.id);
    const amount = d.amount ?? 0;
    if (!when || when < startDate) continue;
    adjudicated += amount;
    if (amount > 0) wonAmounts.push(amount);
    if (when >= monthStart) thisMonth += amount;
  }

  const monthlyGoal = GOAL / MONTHS;
  const missingThisMonth = Math.max(monthlyGoal - thisMonth, 0);
  const elapsed = (now.getUTCFullYear() - sy) * 12 + (now.getUTCMonth() - ((sm || 1) - 1));
  const monthsLeft = Math.max(MONTHS - Math.max(elapsed, 0), 1);
  const needPerMonth = Math.max(GOAL - adjudicated, 0) / monthsLeft;
  const waiting = pendingDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const avgTicket = wonAmounts.length > 0 ? wonAmounts.reduce((a, b) => a + b, 0) / wonAmounts.length : null;
  const seriousQuotes = avgTicket ? Math.ceil((needPerMonth / avgTicket) * CLOSE_RATE_ONE_IN) : null;
  const pct = Math.min(Math.round((adjudicated / GOAL) * 100), 100);

  const items: Array<{ label: string; value: string; hint?: string }> = [
    { label: "Este mês", value: `${formatEuro(thisMonth)} / ${formatEuro(monthlyGoal)}`, hint: "Adjudicado no mês vs meta mensal" },
    { label: "Falta este mês", value: formatEuro(missingThisMonth) },
    { label: "Precisas por mês até ao fim", value: formatEuro(needPerMonth), hint: `${monthsLeft} meses restantes` },
    { label: "Orçamentos à espera", value: formatEuro(waiting), hint: "Proposta enviada + em negociação" },
    {
      label: "Orçamentos sérios por mês",
      value: seriousQuotes !== null ? String(seriousQuotes) : "—",
      hint: avgTicket ? `Ticket médio ${formatEuro(avgTicket)} · fecho 1 em ${CLOSE_RATE_ONE_IN}` : "Sem obras adjudicadas para calcular",
    },
  ];

  return (
    <Card className="mb-8">
      <CardHeader>
        <h2 className="font-display text-[1.1rem]">Meta 100k — {formatEuro(GOAL)} em {MONTHS} meses (sem IVA)</h2>
      </CardHeader>
      <CardBody>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-medium">
            {formatEuro(adjudicated)} de {formatEuro(GOAL)}
          </span>
          <span className="text-sm text-graphite-light">{pct}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-mist-2 overflow-hidden mb-6">
          <div className="h-full bg-gold" style={{ width: `${pct}%`, background: "#D4AF37" }} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {items.map((it) => (
            <div key={it.label}>
              <div className="text-xs text-graphite-light mb-1">{it.label}</div>
              <div className="text-base font-medium">{it.value}</div>
              {it.hint && <div className="text-[11px] text-graphite-light mt-0.5">{it.hint}</div>}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
