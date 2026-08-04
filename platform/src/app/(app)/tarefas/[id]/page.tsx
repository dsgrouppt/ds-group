import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmButton";
import { AttachmentPanel } from "@/components/AttachmentPanel";
import { TASK_STATUS_LABEL, TASK_PRIORITY_LABEL } from "@/lib/enums";
import { updateTask, deleteTask, addComment } from "../actions";
import { uploadAttachment, deleteAttachment } from "@/lib/attachments-actions";

export const dynamic = "force-dynamic";

function formatDateTime(date: Date) {
  return date.toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const user = await requireModuleAccess("tarefas");
  const canEdit = can(user.role, "tarefas", "edit");

  const [task, users, deals, projects] = await Promise.all([
    prisma.task.findUnique({
      where: { id: params.id },
      include: {
        comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
        attachments: { orderBy: { createdAt: "desc" } },
        deal: { select: { id: true, title: true } },
        project: { select: { id: true, title: true } },
      },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.deal.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  if (!task) notFound();

  const revalidatePath = `/tarefas/${task.id}`;
  const boundUpload = uploadAttachment.bind(null, { taskId: task.id, revalidate: revalidatePath });

  return (
    <div>
      <PageHeader title={task.title} description={task.deal?.title ?? task.project?.title ?? undefined} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Editar Tarefa</h2>
          </CardHeader>
          <CardBody>
            <form action={updateTask.bind(null, task.id)} className="flex flex-col gap-4">
              <FieldGroup label="Título" htmlFor="title">
                <Input id="title" name="title" defaultValue={task.title} required disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Descrição" htmlFor="description">
                <Textarea id="description" name="description" rows={2} defaultValue={task.description ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Responsável" htmlFor="assigneeId">
                <Select id="assigneeId" name="assigneeId" defaultValue={task.assigneeId ?? ""} disabled={!canEdit}>
                  <option value="">Sem responsável</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Prioridade" htmlFor="priority">
                <Select id="priority" name="priority" defaultValue={task.priority} disabled={!canEdit}>
                  {Object.entries(TASK_PRIORITY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Estado" htmlFor="status">
                <Select id="status" name="status" defaultValue={task.status} disabled={!canEdit}>
                  {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Prazo" htmlFor="dueAt">
                <Input
                  id="dueAt"
                  name="dueAt"
                  type="date"
                  defaultValue={task.dueAt ? task.dueAt.toISOString().slice(0, 10) : ""}
                  disabled={!canEdit}
                />
              </FieldGroup>
              <FieldGroup label="Negócio associado" htmlFor="dealId">
                <Select id="dealId" name="dealId" defaultValue={task.dealId ?? ""} disabled={!canEdit}>
                  <option value="">Nenhum</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Obra associada" htmlFor="projectId">
                <Select id="projectId" name="projectId" defaultValue={task.projectId ?? ""} disabled={!canEdit}>
                  <option value="">Nenhuma</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              {canEdit && <SubmitButton>Guardar Alterações</SubmitButton>}
            </form>

            {canEdit && (
              <form action={deleteTask.bind(null, task.id)} className="mt-4 pt-4 border-t border-mist-2">
                <ConfirmSubmitButton confirmMessage={`Apagar a tarefa "${task.title}"?`}>Apagar Tarefa</ConfirmSubmitButton>
              </form>
            )}
          </CardBody>
        </Card>

        <AttachmentPanel
          title="Anexos"
          attachments={task.attachments}
          uploadAction={boundUpload}
          deleteAction={async (formData: FormData) => {
            "use server";
            const id = String(formData.get("attachmentId"));
            await deleteAttachment(id, revalidatePath, formData);
          }}
          canEdit={canEdit}
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-[1.1rem]">Comentários ({task.comments.length})</h2>
        </CardHeader>
        <CardBody className="p-0">
          {task.comments.length === 0 ? (
            <EmptyState title="Sem comentários" description="Use os comentários para registar progresso ou decisões sobre esta tarefa." />
          ) : (
            <ul className="divide-y divide-mist-2">
              {task.comments.map((comment) => (
                <li key={comment.id} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{comment.author?.name ?? "Utilizador removido"}</span>
                    <span className="text-xs text-graphite-light">{formatDateTime(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-graphite leading-relaxed whitespace-pre-wrap">{comment.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
        <form action={addComment.bind(null, task.id)} className="px-6 py-4 border-t border-mist-2 flex items-end gap-3">
          <div className="flex-1">
            <Textarea name="body" rows={2} placeholder="Escrever um comentário…" required />
          </div>
          <SubmitButton variant="secondary" className="shrink-0" pendingLabel="A enviar...">
            Comentar
          </SubmitButton>
        </form>
      </Card>
    </div>
  );
}
