import type { Metadata } from "next";
import { requireClient } from "@/lib/client-session";
import { getClientProjects, getProjectEvents } from "@/lib/portal-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { EVENT_TYPE_LABEL, type EventTypeValue } from "@/lib/enums";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cronograma" };

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default async function PortalCronogramaPage() {
  const client = await requireClient();
  const projects = await getClientProjects(client.id);
  const eventsByProject = await Promise.all(projects.map((p) => getProjectEvents(p.id)));
  const allEvents = projects.flatMap((p, i) => eventsByProject[i].map((e) => ({ ...e, projectTitle: p.title })));
  const now = Date.now();
  const upcoming = allEvents.filter((e) => e.startAt.getTime() >= now).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const past = allEvents.filter((e) => e.startAt.getTime() < now).sort((a, b) => b.startAt.getTime() - a.startAt.getTime());

  return (
    <div>
      <PageHeader title="Cronograma" description="Visitas técnicas, reuniões e marcos agendados para a sua obra." />

      {allEvents.length === 0 ? (
        <Card>
          <EmptyState title="Sem eventos agendados" description="Quando a sua equipa de projeto agendar uma visita ou reunião, vai aparecer aqui." />
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {upcoming.length > 0 && (
            <div>
              <h2 className="font-display text-[1.1rem] mb-4">Próximos</h2>
              <Card>
                <CardBody className="p-0">
                  <ul className="divide-y divide-mist-2">
                    {upcoming.map((event) => (
                      <li key={event.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <div className="text-sm font-medium">{event.title}</div>
                          <div className="text-xs text-graphite-light mt-0.5">
                            {formatDateTime(event.startAt)}
                            {event.location ? ` · ${event.location}` : ""}
                            {projects.length > 1 ? ` · ${event.projectTitle}` : ""}
                          </div>
                        </div>
                        <Badge tone="gold">{EVENT_TYPE_LABEL[event.type as EventTypeValue] ?? event.type}</Badge>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="font-display text-[1.1rem] mb-4">Anteriores</h2>
              <Card>
                <CardHeader className="hidden" />
                <CardBody className="p-0">
                  <ul className="divide-y divide-mist-2">
                    {past.map((event) => (
                      <li key={event.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap opacity-70">
                        <div>
                          <div className="text-sm font-medium">{event.title}</div>
                          <div className="text-xs text-graphite-light mt-0.5">
                            {formatDateTime(event.startAt)}
                            {event.location ? ` · ${event.location}` : ""}
                          </div>
                        </div>
                        <Badge>{EVENT_TYPE_LABEL[event.type as EventTypeValue] ?? event.type}</Badge>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
