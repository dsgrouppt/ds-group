import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmButton";
import { EVENT_TYPE_LABEL } from "@/lib/enums";
import { updateEvent, deleteEvent } from "../actions";

export const dynamic = "force-dynamic";

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const user = await requireModuleAccess("agenda");
  const canEdit = can(user.role, "agenda", "edit");

  const [event, projects] = await Promise.all([
    prisma.calendarEvent.findUnique({ where: { id: params.id } }),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  if (!event) notFound();

  return (
    <div>
      <PageHeader title={event.title} description={EVENT_TYPE_LABEL[event.type as keyof typeof EVENT_TYPE_LABEL]} />

      <Card className="max-w-[560px]">
        <CardBody>
          <form action={updateEvent.bind(null, event.id)} className="flex flex-col gap-4">
            <FieldGroup label="Título" htmlFor="title">
              <Input id="title" name="title" defaultValue={event.title} required disabled={!canEdit} />
            </FieldGroup>
            <FieldGroup label="Tipo" htmlFor="type">
              <Select id="type" name="type" defaultValue={event.type} disabled={!canEdit}>
                {Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Início" htmlFor="startAt">
              <Input id="startAt" name="startAt" type="datetime-local" defaultValue={toLocalInput(event.startAt)} required disabled={!canEdit} />
            </FieldGroup>
            <FieldGroup label="Fim" htmlFor="endAt">
              <Input id="endAt" name="endAt" type="datetime-local" defaultValue={event.endAt ? toLocalInput(event.endAt) : ""} disabled={!canEdit} />
            </FieldGroup>
            <FieldGroup label="Obra associada" htmlFor="projectId">
              <Select id="projectId" name="projectId" defaultValue={event.projectId ?? ""} disabled={!canEdit}>
                <option value="">Sem obra associada</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Localização" htmlFor="location">
              <Input id="location" name="location" defaultValue={event.location ?? ""} disabled={!canEdit} />
            </FieldGroup>
            <FieldGroup label="Notas" htmlFor="notes">
              <Textarea id="notes" name="notes" rows={2} defaultValue={event.notes ?? ""} disabled={!canEdit} />
            </FieldGroup>
            {canEdit && <SubmitButton>Guardar Alterações</SubmitButton>}
          </form>

          {canEdit && (
            <form action={deleteEvent.bind(null, event.id)} className="mt-4 pt-4 border-t border-mist-2">
              <ConfirmSubmitButton confirmMessage={`Apagar o evento "${event.title}"?`}>Apagar Evento</ConfirmSubmitButton>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
