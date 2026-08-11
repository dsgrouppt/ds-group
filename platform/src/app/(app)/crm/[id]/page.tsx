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
import {
  LEAD_SOURCE_LABEL,
  PROJECT_TYPE_LABEL,
  BUDGET_RANGE_LABEL,
  DEAL_STAGE_LABEL,
  TASK_STATUS_LABEL,
  LOSS_REASON_LABEL,
  QUALIFICATION_CATEGORY_LABEL,
} from "@/lib/enums";
import { QUALIFICATION_CRITERIA } from "@/lib/qualification";
import { updateDeal, deleteDeal, advanceDealStage, submitQualification } from "../actions";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const user = await requireModuleAccess("crm");
  const canEdit = can(user.role, "crm", "edit");

  const [deal, clients] = await Promise.all([
    prisma.deal.findUnique({
      where: { id: params.id },
      include: { client: true, tasks: { orderBy: { createdAt: "desc" } }, project: true },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!deal) notFound();

  return (
    <div>
      <PageHeader
        title={deal.title}
        description={`${deal.client.name} · ${DEAL_STAGE_LABEL[deal.stage as keyof typeof DEAL_STAGE_LABEL]}`}
        action={
          <Link href="/crm" className="text-sm text-graphite-light hover:text-ink">
            ← Todos os negócios
          </Link>
        }
      />

      {deal.project && (
        <Card className="mb-6">
          <CardBody className="flex items-center justify-between">
            <span className="text-sm">Este negócio já gerou uma obra.</span>
            <Link href={`/obras/${deal.project.id}`} className="link-arrow text-sm font-medium hover:underline">
              Ver obra →
            </Link>
          </CardBody>
        </Card>
      )}

      {(deal.qualificationCategory || deal.firstContactedAt || deal.lossReason) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {deal.qualificationCategory && (
            <Badge tone={deal.qualificationCategory === "PRIORITARIO" || deal.qualificationCategory === "QUALIFICADO" ? "success" : "neutral"}>
              Qualificação: {QUALIFICATION_CATEGORY_LABEL[deal.qualificationCategory as keyof typeof QUALIFICATION_CATEGORY_LABEL] ?? deal.qualificationCategory}
              {typeof deal.qualificationScore === "number" ? ` (${deal.qualificationScore}/10)` : ""}
            </Badge>
          )}
          {deal.firstContactedAt && (
            <Badge tone="neutral">Primeiro contacto: {deal.firstContactedAt.toLocaleString("pt-PT")}</Badge>
          )}
          {deal.lossReason && (
            <Badge tone="danger">Motivo de perda: {LOSS_REASON_LABEL[deal.lossReason as keyof typeof LOSS_REASON_LABEL] ?? deal.lossReason}</Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Editar Negócio</h2>
          </CardHeader>
          <CardBody>
            <form action={updateDeal.bind(null, deal.id)} className="flex flex-col gap-4">
              <FieldGroup label="Título" htmlFor="title">
                <Input id="title" name="title" defaultValue={deal.title} required disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Cliente" htmlFor="clientId">
                <Select id="clientId" name="clientId" defaultValue={deal.clientId} disabled={!canEdit}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Origem do lead" htmlFor="source">
                <Select id="source" name="source" defaultValue={deal.source} disabled={!canEdit}>
                  {Object.entries(LEAD_SOURCE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Tipo de projeto" htmlFor="projectType">
                <Select id="projectType" name="projectType" defaultValue={deal.projectType} disabled={!canEdit}>
                  {Object.entries(PROJECT_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Faixa de orçamento" htmlFor="budgetRange">
                <Select id="budgetRange" name="budgetRange" defaultValue={deal.budgetRange ?? ""} disabled={!canEdit}>
                  <option value="">Não definido</option>
                  {Object.entries(BUDGET_RANGE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Valor proposto (€)" htmlFor="amount">
                <Input id="amount" name="amount" type="number" min="0" step="100" defaultValue={deal.amount ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Notas de qualificação" htmlFor="notes">
                <Textarea id="notes" name="notes" rows={3} defaultValue={deal.notes ?? ""} disabled={!canEdit} />
              </FieldGroup>
              {canEdit && <SubmitButton>Guardar Alterações</SubmitButton>}
            </form>

            {canEdit && (
              <form action={deleteDeal.bind(null, deal.id)} className="mt-4 pt-4 border-t border-mist-2">
                <ConfirmSubmitButton confirmMessage={`Apagar o negócio "${deal.title}"? Só é possível se ainda não tiver gerado uma obra.`}>
                  Apagar Negócio
                </ConfirmSubmitButton>
              </form>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Tarefas ({deal.tasks.length})</h2>
          </CardHeader>
          <CardBody className="p-0">
            {deal.tasks.length === 0 ? (
              <EmptyState title="Sem tarefas" description="Crie tarefas em Tarefas, associadas a este negócio." />
            ) : (
              <ul className="divide-y divide-mist-2">
                {deal.tasks.map((task) => (
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
      </div>

      {canEdit && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <h2 className="font-display text-[1.1rem]">Qualificação (doc 05 §3)</h2>
            </CardHeader>
            <CardBody>
              <form action={submitQualification.bind(null, deal.id)} className="flex flex-col gap-4">
                {QUALIFICATION_CRITERIA.map((criterion) => (
                  <FieldGroup key={criterion.key} label={criterion.label} htmlFor={criterion.key} hint={criterion.helpText}>
                    <Select id={criterion.key} name={criterion.key} defaultValue="" required>
                      <option value="" disabled>
                        Selecionar
                      </option>
                      {criterion.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.value} — {opt.label}
                        </option>
                      ))}
                    </Select>
                  </FieldGroup>
                ))}
                <SubmitButton>Calcular Score e Guardar</SubmitButton>
              </form>
            </CardBody>
          </Card>

          {deal.stage !== "FECHADO_GANHO" && deal.stage !== "FECHADO_PERDIDO" && (
            <Card>
              <CardHeader>
                <h2 className="font-display text-[1.1rem]">Fechar como Perdido</h2>
              </CardHeader>
              <CardBody>
                <form action={advanceDealStage.bind(null, deal.id)} className="flex flex-col gap-4">
                  <input type="hidden" name="nextStage" value="FECHADO_PERDIDO" />
                  <FieldGroup label="Motivo de perda" htmlFor="lossReason">
                    <Select id="lossReason" name="lossReason" defaultValue="" required>
                      <option value="" disabled>
                        Selecionar motivo
                      </option>
                      {Object.entries(LOSS_REASON_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </FieldGroup>
                  <ConfirmSubmitButton confirmMessage={`Fechar "${deal.title}" como Fechado Perdido? Esta ação regista o motivo e (para "Sem resposta"/"Adiou projeto") agenda uma tarefa de reativação futura.`}>
                    Fechar Negócio como Perdido
                  </ConfirmSubmitButton>
                </form>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
