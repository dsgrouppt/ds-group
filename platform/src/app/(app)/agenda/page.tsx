import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EVENT_TYPE, EVENT_TYPE_LABEL } from "@/lib/enums";
import { createEvent } from "./actions";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const user = await requireModuleAccess("agenda");
  const canEdit = can(user.role, "agenda", "edit");

  // Duas queries separadas, não uma só filtrada em memória — com uma
  // única query ordenada por `startAt` (crescente) e limitada a N linhas,
  // eventos passados antigos (que ordenam sempre primeiro) podiam encher o
  // limite e fazer eventos futuros desaparecerem da lista assim que o
  // total de eventos alguma vez criados ultrapassasse esse limite.
  const now = new Date();
  const [upcoming, pastCount, past, projects] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      include: { project: { select: { title: true } } },
      take: 500,
    }),
    prisma.calendarEvent.count({ where: { startAt: { lt: now } } }),
    prisma.calendarEvent.findMany({
      where: { startAt: { lt: now } },
      orderBy: { startAt: "desc" },
      include: { project: { select: { title: true } } },
      take: 100,
    }),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true }, take: 500 }),
  ]);

  return (
    <div>
      <PageHeader title="Agenda" description="Visitas técnicas, kickoffs, vistorias e reuniões — cruzadas com Obras." />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-display text-[1.1rem]">Próximos ({upcoming.length})</h2>
            </CardHeader>
            <CardBody className="p-0">
              {upcoming.length === 0 ? (
                <EmptyState title="Sem eventos agendados" description="Agende o primeiro evento usando o formulário ao lado." />
              ) : (
                <Table>
                  <Thead>
                    <tr>
                      <Th>Evento</Th>
                      <Th>Tipo</Th>
                      <Th>Obra</Th>
                      <Th>Data</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {upcoming.map((event) => (
                      <Tr key={event.id}>
                        <Td className="font-medium">
                          <Link href={`/agenda/${event.id}`} className="hover:underline">
                            {event.title}
                          </Link>
                        </Td>
                        <Td>
                          <Badge tone="gold">{EVENT_TYPE_LABEL[event.type as keyof typeof EVENT_TYPE_LABEL]}</Badge>
                        </Td>
                        <Td className="text-graphite-light">{event.project?.title ?? "—"}</Td>
                        <Td className="text-graphite-light">
                          {event.startAt.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>

          {past.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-display text-[1.1rem]">
                  Anteriores ({pastCount}){pastCount > past.length ? ` — a mostrar os ${past.length} mais recentes` : ""}
                </h2>
              </CardHeader>
              <CardBody className="p-0">
                <Table>
                  <Thead>
                    <tr>
                      <Th>Evento</Th>
                      <Th>Tipo</Th>
                      <Th>Data</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {past.map((event) => (
                      <Tr key={event.id}>
                        <Td className="text-graphite-light">{event.title}</Td>
                        <Td className="text-graphite-light">{EVENT_TYPE_LABEL[event.type as keyof typeof EVENT_TYPE_LABEL]}</Td>
                        <Td className="text-graphite-light">{event.startAt.toLocaleDateString("pt-PT")}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          )}
        </div>

        {canEdit && (
          <Card>
            <CardHeader>
              <h2 className="font-display text-[1.1rem]">Novo Evento</h2>
            </CardHeader>
            <CardBody>
              <form action={createEvent} className="flex flex-col gap-4">
                <FieldGroup label="Título" htmlFor="title">
                  <Input id="title" name="title" required />
                </FieldGroup>
                <FieldGroup label="Tipo" htmlFor="type">
                  <Select id="type" name="type" defaultValue={EVENT_TYPE.OUTRO}>
                    {Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <FieldGroup label="Início" htmlFor="startAt">
                  <Input id="startAt" name="startAt" type="datetime-local" required />
                </FieldGroup>
                <FieldGroup label="Fim" htmlFor="endAt">
                  <Input id="endAt" name="endAt" type="datetime-local" />
                </FieldGroup>
                <FieldGroup label="Obra associada" htmlFor="projectId">
                  <Select id="projectId" name="projectId" defaultValue="">
                    <option value="">Sem obra associada</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <FieldGroup label="Localização" htmlFor="location">
                  <Input id="location" name="location" />
                </FieldGroup>
                <FieldGroup label="Notas" htmlFor="notes">
                  <Textarea id="notes" name="notes" rows={2} />
                </FieldGroup>
                <SubmitButton>Agendar</SubmitButton>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
