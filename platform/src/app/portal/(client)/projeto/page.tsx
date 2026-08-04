import type { Metadata } from "next";
import { requireClient } from "@/lib/client-session";
import { getClientProjects, projectStageTimeline } from "@/lib/portal-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { PROJECT_TYPE_LABEL, type ProjectTypeValue } from "@/lib/enums";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "O Meu Projeto" };

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export default async function PortalProjetoPage() {
  const client = await requireClient();
  const projects = await getClientProjects(client.id);

  return (
    <div>
      <PageHeader title="O Meu Projeto" description="Detalhe e ponto de situação de cada obra associada à sua conta." />

      {projects.length === 0 ? (
        <Card>
          <EmptyState title="Sem projetos" description="Ainda não existe nenhuma obra registada." />
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {projects.map((project) => {
            const timeline = projectStageTimeline(project.stage);
            const current = timeline.find((s) => s.status === "current");
            const budget = formatCurrency(project.budgetAmount);

            return (
              <Card key={project.id}>
                <CardHeader className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="font-display text-[1.2rem]">{project.title}</h2>
                    <p className="text-xs text-graphite-light mt-1">
                      {PROJECT_TYPE_LABEL[project.serviceType as ProjectTypeValue] ?? project.serviceType}
                      {project.location ? ` · ${project.location}` : ""}
                    </p>
                  </div>
                  <Badge tone="gold">{current?.label ?? "—"}</Badge>
                </CardHeader>
                <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                  <div>
                    <div className="text-xs text-graphite-light uppercase tracking-wide mb-1">Início</div>
                    <div>{formatDate(project.startDate)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-graphite-light uppercase tracking-wide mb-1">Previsão de entrega</div>
                    <div>{formatDate(project.dueDate)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-graphite-light uppercase tracking-wide mb-1">Entregue em</div>
                    <div>{formatDate(project.deliveredAt)}</div>
                  </div>
                  {budget && (
                    <div>
                      <div className="text-xs text-graphite-light uppercase tracking-wide mb-1">Orçamento contratado</div>
                      <div>{budget}</div>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
