import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldGroup, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmButton";
import { INVOICE_STATUS_LABEL } from "@/lib/enums";
import { formatEuro as formatEuroBase } from "@/lib/format";
import { updateInvoice, deleteInvoice, registerPayment } from "../actions";

function formatEuro(value: number) {
  return formatEuroBase(value, { decimals: 2 });
}

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const user = await requireModuleAccess("financeiro");
  const canEdit = can(user.role, "financeiro", "edit");

  const [invoice, projects] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: params.id },
      include: { project: true, payments: { orderBy: { paidAt: "desc" } } },
    }),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  if (!invoice) notFound();

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = invoice.amount - totalPaid;

  return (
    <div>
      <PageHeader title={invoice.number} description={invoice.project?.title ?? "Sem obra associada"} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Editar Fatura</h2>
          </CardHeader>
          <CardBody>
            <form action={updateInvoice.bind(null, invoice.id)} className="flex flex-col gap-4">
              <FieldGroup label="Número" htmlFor="number">
                <Input id="number" name="number" defaultValue={invoice.number} required disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Obra associada" htmlFor="projectId">
                <Select id="projectId" name="projectId" defaultValue={invoice.projectId ?? ""} disabled={!canEdit}>
                  <option value="">Sem obra associada</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Valor (€)" htmlFor="amount">
                <Input id="amount" name="amount" type="number" min="0" step="0.01" defaultValue={invoice.amount} required disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Estado" htmlFor="status">
                <Select id="status" name="status" defaultValue={invoice.status} disabled={!canEdit}>
                  {Object.entries(INVOICE_STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Prazo de pagamento" htmlFor="dueDate">
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  defaultValue={invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : ""}
                  disabled={!canEdit}
                />
              </FieldGroup>
              {canEdit && <SubmitButton>Guardar Alterações</SubmitButton>}
            </form>

            {canEdit && (
              <form action={deleteInvoice.bind(null, invoice.id)} className="mt-4 pt-4 border-t border-mist-2">
                <ConfirmSubmitButton confirmMessage={`Apagar a fatura "${invoice.number}"?`}>Apagar Fatura</ConfirmSubmitButton>
              </form>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">
              Pagamentos — Recebido {formatEuro(totalPaid)} de {formatEuro(invoice.amount)}
              {remaining > 0 && ` (falta ${formatEuro(remaining)})`}
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {invoice.payments.length === 0 ? (
              <EmptyState title="Sem pagamentos registados" />
            ) : (
              <ul className="divide-y divide-mist-2">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                    <span className="text-sm">{p.method || "Pagamento"}</span>
                    <span className="text-sm font-medium">{formatEuro(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
          {canEdit && remaining > 0 && (
            <form action={registerPayment.bind(null, invoice.id)} className="px-6 py-4 border-t border-mist-2 flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <FieldGroup label="Valor (€)" htmlFor="amount">
                  <Input id="amount" name="amount" type="number" min="0" step="0.01" defaultValue={remaining} required />
                </FieldGroup>
              </div>
              <div className="flex-1 min-w-[140px]">
                <FieldGroup label="Método" htmlFor="method">
                  <Input id="method" name="method" placeholder="Transferência" />
                </FieldGroup>
              </div>
              <SubmitButton variant="secondary" pendingLabel="A registar...">
                Registar Pagamento
              </SubmitButton>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
