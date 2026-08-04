import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { DEAL_STAGE_LABEL, EVENT_TYPE_LABEL, TASK_STATUS_LABEL, LEAD_SOURCE_LABEL } from "@/lib/enums";
import { formatEuro } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const [
    dealCount,
    activeProjectCount,
    clientCount,
    openDeals,
    pendingTasks,
    urgentTaskCount,
    upcomingEvents,
    paidInvoicesThisMonth,
    dealsWonCount,
    dealsLostCount,
    costedProjects,
    outstandingInvoices,
    leadsBySource,
  ] = await Promise.all([
    prisma.deal.count({ where: { stage: { notIn: ["FECHADO_GANHO", "FECHADO_PERDIDO"] } } }),
    prisma.project.count({ where: { stage: { not: "ENTREGUE" } } }),
    prisma.client.count(),
    prisma.deal.findMany({
      where: { stage: { notIn: ["FECHADO_GANHO", "FECHADO_PERDIDO"] } },
      select: { amount: true, probability: true },
      take: 5000,
    }),
    prisma.task.findMany({
      where: { status: { in: ["PENDENTE", "EM_CURSO"] } },
      orderBy: { dueAt: "asc" },
      take: 6,
      include: { assignee: { select: { name: true } } },
    }),
    prisma.task.count({ where: { status: { in: ["PENDENTE", "EM_CURSO"] }, priority: "URGENTE" } }),
    prisma.calendarEvent.findMany({
      where: { startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
    prisma.invoice.aggregate({
      where: { status: "PAGA", paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { amount: true },
    }),
    prisma.deal.count({ where: { stage: "FECHADO_GANHO" } }),
    prisma.deal.count({ where: { stage: "FECHADO_PERDIDO" } }),
    prisma.project.findMany({
      where: { budgetAmount: { not: null }, costAmount: { not: null } },
      select: { budgetAmount: true, costAmount: true },
      take: 5000,
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["EMITIDA", "ATRASADA"] } },
      include: { payments: true },
      take: 5000,
    }),
    prisma.deal.groupBy({ by: ["source"], _count: { source: true } }),
  ]);

  const weightedPipeline = openDeals.reduce((sum, d) => sum + ((d.amount ?? 0) * d.probability) / 100, 0);

  const closedTotal = dealsWonCount + dealsLostCount;
  const winRate = closedTotal > 0 ? (dealsWonCount / closedTotal) * 100 : null;

  const margins = costedProjects
    .filter((p) => p.budgetAmount && p.budgetAmount > 0)
    .map((p) => ((p.budgetAmount! - p.costAmount!) / p.budgetAmount!) * 100);
  const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : null;

  const outstandingAmount = outstandingInvoices.reduce((sum, inv) => {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(inv.amount - paid, 0);
  }, 0);

  const totalLeads = leadsBySource.reduce((sum, row) => sum + row._count.source, 0);

  return {
    dealCount,
    activeProjectCount,
    clientCount,
    weightedPipeline,
    pendingTasks,
    urgentTaskCount,
    upcomingEvents,
    revenueThisMonth: paidInvoicesThisMonth._sum.amount ?? 0,
    winRate,
    dealsWonCount,
    dealsLostCount,
    avgMargin,
    outstandingAmount,
    leadsBySource,
    totalLeads,
  };
}

export default async function DashboardPage() {
  await requireModuleAccess("dashboard");
  const data = await getDashboardData();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão executiva da atividade comercial, operacional e financeira da DS Group."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Negócios em Aberto" value={data.dealCount} />
        <StatCard label="Obras Ativas" value={data.activeProjectCount} />
        <StatCard label="Clientes" value={data.clientCount} />
        <StatCard
          label="Pipeline Ponderado"
          value={data.weightedPipeline > 0 ? formatEuro(data.weightedPipeline) : null}
          hint="Valor × probabilidade de cada negócio em aberto"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Taxa de Fecho (Win Rate)"
          value={data.winRate !== null ? data.winRate.toFixed(0) : null}
          suffix={data.winRate !== null ? "%" : undefined}
          hint={`${data.dealsWonCount} ganhos · ${data.dealsLostCount} perdidos`}
        />
        <StatCard
          label="Margem Bruta Média"
          value={data.avgMargin !== null ? data.avgMargin.toFixed(0) : null}
          suffix={data.avgMargin !== null ? "%" : undefined}
          hint="Obras com orçamento e custo registados"
        />
        <StatCard
          label="Faturação Recebida (mês)"
          value={data.revenueThisMonth > 0 ? formatEuro(data.revenueThisMonth) : null}
        />
        <StatCard
          label="Por Receber"
          value={data.outstandingAmount > 0 ? formatEuro(data.outstandingAmount) : null}
          hint="Faturas emitidas ou atrasadas"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">
              Tarefas Pendentes {data.urgentTaskCount > 0 && <Badge tone="danger">{data.urgentTaskCount} urgente{data.urgentTaskCount === 1 ? "" : "s"}</Badge>}
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {data.pendingTasks.length === 0 ? (
              <EmptyState title="Sem tarefas pendentes" description="Todas as tarefas atribuídas estão concluídas." />
            ) : (
              <ul className="divide-y divide-mist-2">
                {data.pendingTasks.map((task) => (
                  <li key={task.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="text-xs text-graphite-light mt-0.5">
                        {TASK_STATUS_LABEL[task.status as keyof typeof TASK_STATUS_LABEL]}
                        {task.assignee?.name ? ` · ${task.assignee.name}` : ""}
                      </div>
                    </div>
                    {task.dueAt && (
                      <span className="text-xs text-graphite-light shrink-0">
                        {new Date(task.dueAt).toLocaleDateString("pt-PT")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Próximos Eventos</h2>
          </CardHeader>
          <CardBody className="p-0">
            {data.upcomingEvents.length === 0 ? (
              <EmptyState title="Sem eventos agendados" description="Crie visitas técnicas, kickoffs ou vistorias na Agenda." />
            ) : (
              <ul className="divide-y divide-mist-2">
                {data.upcomingEvents.map((event) => (
                  <li key={event.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium">{event.title}</div>
                      <div className="text-xs text-graphite-light mt-0.5">
                        {EVENT_TYPE_LABEL[event.type as keyof typeof EVENT_TYPE_LABEL]}
                      </div>
                    </div>
                    <span className="text-xs text-graphite-light shrink-0">
                      {new Date(event.startAt).toLocaleDateString("pt-PT")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-[1.1rem]">Desempenho Comercial — Leads por Origem</h2>
        </CardHeader>
        <CardBody className="p-0">
          {data.totalLeads === 0 ? (
            <EmptyState title="Ainda sem negócios no CRM" description="A origem dos leads aparece aqui automaticamente." />
          ) : (
            <ul className="divide-y divide-mist-2">
              {[...data.leadsBySource]
                .sort((a, b) => b._count.source - a._count.source)
                .map((row) => (
                  <li key={row.source} className="px-6 py-3.5 flex items-center justify-between">
                    <span className="text-sm">{LEAD_SOURCE_LABEL[row.source as keyof typeof LEAD_SOURCE_LABEL]}</span>
                    <span className="text-sm font-medium">
                      {row._count.source} · {Math.round((row._count.source / data.totalLeads) * 100)}%
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <p className="text-xs text-graphite-light mt-8">
        Indicadores adicionais (NPS pós-obra, taxa de reincidência, tempo médio de resposta a lead) entram quando
        houver volume de dados real — ver docs/crm-especificacao.md §7.
      </p>
    </div>
  );
}
