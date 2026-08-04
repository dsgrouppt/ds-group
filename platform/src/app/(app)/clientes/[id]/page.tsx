import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmButton";
import { AttachmentPanel } from "@/components/AttachmentPanel";
import { CLIENT_TYPE_LABEL, DEAL_STAGE_LABEL, PROJECT_STAGE_LABEL } from "@/lib/enums";
import { updateClient, deleteClient } from "../actions";
import { uploadAttachment, deleteAttachment } from "@/lib/attachments-actions";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const user = await requireModuleAccess("clientes");
  const canEdit = can(user.role, "clientes", "edit");

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      deals: { orderBy: { createdAt: "desc" } },
      projects: { orderBy: { createdAt: "desc" } },
      tags: { include: { tag: true } },
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) notFound();

  const revalidatePath = `/clientes/${client.id}`;
  const boundUpload = uploadAttachment.bind(null, { clientId: client.id, revalidate: revalidatePath });

  return (
    <div>
      <PageHeader
        title={client.name}
        description={[
          CLIENT_TYPE_LABEL[client.type as keyof typeof CLIENT_TYPE_LABEL],
          client.location,
          client.email,
          client.phone,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <Link href="/clientes" className="text-sm text-graphite-light hover:text-ink">
            ← Todos os clientes
          </Link>
        }
      />

      {client.tags.length > 0 && (
        <div className="flex gap-2 mb-8 flex-wrap">
          {client.tags.map((t) => (
            <Badge key={t.tagId} tone="gold">
              {t.tag.name}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Negócios</h2>
          </CardHeader>
          <CardBody className="p-0">
            {client.deals.length === 0 ? (
              <EmptyState title="Sem negócios" description="Crie um negócio no CRM associado a este cliente." />
            ) : (
              <ul className="divide-y divide-mist-2">
                {client.deals.map((deal) => (
                  <li key={deal.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <Link href={`/crm/${deal.id}`} className="text-sm font-medium hover:underline">
                      {deal.title}
                    </Link>
                    <Badge>{DEAL_STAGE_LABEL[deal.stage as keyof typeof DEAL_STAGE_LABEL]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Obras</h2>
          </CardHeader>
          <CardBody className="p-0">
            {client.projects.length === 0 ? (
              <EmptyState title="Sem obras" description="Um negócio fechado gera automaticamente uma obra." />
            ) : (
              <ul className="divide-y divide-mist-2">
                {client.projects.map((project) => (
                  <li key={project.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <Link href={`/obras/${project.id}`} className="text-sm font-medium hover:underline">
                      {project.title}
                    </Link>
                    <Badge>{PROJECT_STAGE_LABEL[project.stage as keyof typeof PROJECT_STAGE_LABEL]}</Badge>
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
            <h2 className="font-display text-[1.1rem]">Editar Cliente</h2>
          </CardHeader>
          <CardBody>
            <form action={updateClient.bind(null, client.id)} className="flex flex-col gap-4">
              <FieldGroup label="Nome" htmlFor="name">
                <Input id="name" name="name" defaultValue={client.name} required disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Tipo de Cliente" htmlFor="type">
                <Select id="type" name="type" defaultValue={client.type} disabled={!canEdit}>
                  {Object.entries(CLIENT_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Email" htmlFor="email">
                <Input id="email" name="email" type="email" defaultValue={client.email ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Telefone" htmlFor="phone">
                <Input id="phone" name="phone" defaultValue={client.phone ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Localização do imóvel" htmlFor="location">
                <Input id="location" name="location" defaultValue={client.location ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Notas de qualificação" htmlFor="notes">
                <Textarea id="notes" name="notes" rows={3} defaultValue={client.notes ?? ""} disabled={!canEdit} />
              </FieldGroup>
              {canEdit && <SubmitButton>Guardar Alterações</SubmitButton>}
            </form>

            {canEdit && (
              <form action={deleteClient.bind(null, client.id)} className="mt-4 pt-4 border-t border-mist-2">
                <ConfirmSubmitButton confirmMessage={`Apagar o cliente "${client.name}"? Só é possível se não tiver negócios ou obras associadas.`}>
                  Apagar Cliente
                </ConfirmSubmitButton>
              </form>
            )}
          </CardBody>
        </Card>

        <AttachmentPanel
          title="Documentos e Fotografias"
          attachments={client.attachments}
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
