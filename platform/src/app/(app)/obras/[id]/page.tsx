import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatEuro } from "@/lib/format";
import { FieldGroup, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmButton";
import { AttachmentPanel } from "@/components/AttachmentPanel";
import { PROJECT_TYPE_LABEL, PROJECT_STAGE_LABEL, TASK_STATUS_LABEL } from "@/lib/enums";
import { updateProject, deleteProject } from "../actions";
import { uploadAttachment, deleteAttachment } from "@/lib/attachments-actions";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const user = await requireModuleAccess("obras");
  const canEdit = can(user.role, "obras", "edit");

  const [project, clients] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        tasks: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { issueDate: "desc" } },
        attachments: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!project) notFound();

  const margin =
    project.budgetAmount && project.costAmount
      ? ((project.budgetAmount - project.costAmount) / project.budgetAmount) * 100
      : null;

  const revalidatePath = `/obras/${project.id}`;
  const boundUpload = uploadAttachment.bind(null, { projectId: project.id, revalidate: revalidatePath });

  return (
    <div>
      <PageHeader
        title={project.title}
        description={`${project.client.name} · ${PROJECT_TYPE_LABEL[project.serviceType as keyof typeof PROJECT_TYPE_LABEL]}`}
        action={
          <Link href="/obras" className="text-sm text-graphite-light hover:text-ink">
            ← Todas as obras
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Etapa" value={PROJECT_STAGE_LABEL[project.stage as keyof typeof PROJECT_STAGE_LABEL]} />
        <StatCard label="Orçamento" value={project.budgetAmount ? formatEuro(project.budgetAmount) : null} />
        <StatCard label="Custo" value={project.costAmount ? formatEuro(project.costAmount) : null} />
        <StatCard label="Margem" value={margin !== null ? `${margin.toFixed(1)}` : null} suffix={margin !== null ? "%" : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Tarefas ({project.tasks.length})</h2>
          </CardHeader>
          <CardBody className="p-0">
            {project.tasks.length === 0 ? (
              <EmptyState title="Sem tarefas" description="Crie tarefas em Tarefas, associadas a esta obra." />
            ) : (
              <ul className="divide-y divide-mist-2">
                {project.tasks.map((task) => (
                  <li key={task.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                    <Link href={`/tarefas/${task.id}`} className="text-sm font-medium hover:underline">
                      {task.title}
                    </Link>
                    <Badge tone={task.status === "CONCLUIDA" ? "success" : "neutral"}>
                      {TASK_STATUS_LABEL[task.status as keyof typeof TASK_STATUS_LABEL]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Faturas ({project.invoices.length})</h2>
          </CardHeader>
          <CardBody className="p-0">
            {project.invoices.length === 0 ? (
              <EmptyState title="Sem faturas" description="Registe faturas em Financeiro, associadas a esta obra." />
            ) : (
              <ul className="divide-y divide-mist-2">
                {project.invoices.map((inv) => (
                  <li key={inv.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                    <Link href={`/financeiro/${inv.id}`} className="text-sm font-medium hover:underline">
                      {inv.number}
                    </Link>
                    <span className="text-sm text-graphite-light">{formatEuro(inv.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Editar Obra</h2>
          </CardHeader>
          <CardBody>
            <form action={updateProject.bind(null, project.id)} className="flex flex-col gap-4">
              <FieldGroup label="Título" htmlFor="title">
                <Input id="title" name="title" defaultValue={project.title} required disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Cliente" htmlFor="clientId">
                <Select id="clientId" name="clientId" defaultValue={project.clientId} disabled={!canEdit}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Tipo de serviço" htmlFor="serviceType">
                <Select id="serviceType" name="serviceType" defaultValue={project.serviceType} disabled={!canEdit}>
                  {Object.entries(PROJECT_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Localização" htmlFor="location">
                <Input id="location" name="location" defaultValue={project.location ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Data de início" htmlFor="startDate">
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={project.startDate ? project.startDate.toISOString().slice(0, 10) : ""}
                  disabled={!canEdit}
                />
              </FieldGroup>
              <FieldGroup label="Prazo previsto" htmlFor="dueDate">
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  defaultValue={project.dueDate ? project.dueDate.toISOString().slice(0, 10) : ""}
                  disabled={!canEdit}
                />
              </FieldGroup>
              <FieldGroup label="Orçamento (€)" htmlFor="budgetAmount">
                <Input id="budgetAmount" name="budgetAmount" type="number" min="0" step="100" defaultValue={project.budgetAmount ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Custo real (€)" htmlFor="costAmount">
                <Input id="costAmount" name="costAmount" type="number" min="0" step="100" defaultValue={project.costAmount ?? ""} disabled={!canEdit} />
              </FieldGroup>
              {canEdit && <SubmitButton>Guardar Alterações</SubmitButton>}
            </form>

            {canEdit && (
              <form action={deleteProject.bind(null, project.id)} className="mt-4 pt-4 border-t border-mist-2">
                <ConfirmSubmitButton confirmMessage={`Apagar a obra "${project.title}"? Só é possível se não tiver faturas associadas.`}>
                  Apagar Obra
                </ConfirmSubmitButton>
              </form>
            )}
          </CardBody>
        </Card>

        <AttachmentPanel
          title="Fotografias e Documentos"
          attachments={project.attachments}
          uploadAction={boundUpload}
          deleteAction={async (formData: FormData) => {
            "use server";
            const id = String(formData.get("attachmentId"));
            await deleteAttachment(id, revalidatePath, formData);
          }}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
