import Link from "next/link";
import { requireClient } from "@/lib/client-session";
import { getPrimaryProject, getProjectEvents, countUnreadMessages, projectStageTimeline } from "@/lib/portal-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PROJECT_STAGE_LABEL, PROJECT_TYPE_LABEL, type ProjectTypeValue } from "@/lib/enums";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

export default async function PortalDashboardPage() {
  const client = await requireClient();
  const project = await getPrimaryProject(client.id);

  if (!project) {
    return (
      <div>
        <PageHeader title={`Bem-vindo(a), ${client.name ?? ""}`} description="Ainda não há nenhum projeto associado à sua conta." />
        <Card>
          <EmptyState
            title="Sem projeto ativo"
            description="Assim que a sua equipa de projeto criar a obra, vai aparecer aqui automaticamente."
          />
        </Card>
      </div>
    );
  }

  const [events, unread] = await Promise.all([getProjectEvents(project.id), countUnreadMessages(client.id)]);
  const nextEvent = events.find((e) => e.startAt.getTime() >= Date.now()) ?? null;
  const timeline = projectStageTimeline(project.stage);
  const currentStep = timeline.find((s) => s.status === "current");

  return (
    <div>
      <PageHeader title={`Bem-vindo(a), ${client.name ?? ""}`} description={project.title} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <StatCard label="Fase atual" value={currentStep?.label ?? PROJECT_STAGE_LABEL[project.stage as keyof typeof PROJECT_STAGE_LABEL] ?? "—"} />
        <StatCard label="Próximo evento" value={nextEvent ? formatDate(nextEvent.startAt) : "Por agendar"} hint={nextEvent?.title} />
        <StatCard label="Mensagens por ler" value={unread} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Percurso da obra</h2>
          </CardHeader>
          <CardBody>
            <ol className="flex flex-col gap-0">
              {timeline.map((step, index) => (
                <li key={step.stage} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center">
                    <span
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                        step.status === "done" ? "bg-gold" : step.status === "current" ? "bg-black" : "bg-mist-2"
                      }`}
                    />
                    {index < timeline.length - 1 && <span className="w-px flex-1 bg-mist-2 min-h-[24px]" />}
                  </div>
                  <div className="pb-6">
                    <div className={`text-sm ${step.status === "current" ? "font-medium text-ink" : "text-graphite-light"}`}>
                      {step.label}
                    </div>
                    {step.status === "current" && <div className="text-xs text-graphite-light mt-0.5">Estamos aqui.</div>}
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Detalhes do projeto</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 text-sm">
            <div>
              <div className="text-xs text-graphite-light uppercase tracking-wide mb-1">Tipo</div>
              <div>{PROJECT_TYPE_LABEL[project.serviceType as ProjectTypeValue] ?? project.serviceType}</div>
            </div>
            {project.location && (
              <div>
                <div className="text-xs text-graphite-light uppercase tracking-wide mb-1">Localização</div>
                <div>{project.location}</div>
              </div>
            )}
            {project.startDate && (
              <div>
                <div className="text-xs text-graphite-light uppercase tracking-wide mb-1">Início</div>
                <div>{formatDate(project.startDate)}</div>
              </div>
            )}
            {project.dueDate && (
              <div>
                <div className="text-xs text-graphite-light uppercase tracking-wide mb-1">Previsão de entrega</div>
                <div>{formatDate(project.dueDate)}</div>
              </div>
            )}
            <Link href="/portal/projeto" className="text-sm font-medium underline underline-offset-2 mt-1">
              Ver detalhe completo →
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
