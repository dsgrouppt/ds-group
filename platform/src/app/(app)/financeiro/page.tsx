import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { formatEuro } from "@/lib/format";
import { FieldGroup, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { INVOICE_STATUS, INVOICE_STATUS_LABEL } from "@/lib/enums";
import { createInvoice } from "./actions";
import { Pagination, parsePage, PAGE_SIZE } from "@/components/ui/Pagination";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({ searchParams }: { searchParams?: { page?: string } }) {
  const user = await requireModuleAccess("financeiro");
  const canEdit = can(user.role, "financeiro", "edit");

  const page = parsePage(searchParams);
  const [invoices, totalCount, projects, paidAgg, overdueAgg] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { issueDate: "desc" },
      include: { project: { select: { title: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.invoice.count(),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true }, take: 500 }),
    prisma.invoice.aggregate({ where: { status: "PAGA" }, _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { status: "ATRASADA" }, _sum: { amount: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Faturação por obra — emissão, cobrança e atrasos."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Faturas" value={totalCount} />
        <StatCard label="Total Pago" value={paidAgg._sum.amount ? formatEuro(paidAgg._sum.amount) : null} />
        <StatCard label="Em Atraso" value={overdueAgg._sum.amount ? formatEuro(overdueAgg._sum.amount) : null} />
        <StatCard label="Margem Bruta Média" value={null} hint="Requer custos de obra (Fase seguinte)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">{totalCount} fatura{totalCount === 1 ? "" : "s"}</h2>
          </CardHeader>
          <CardBody className="p-0">
            {invoices.length === 0 ? (
              <EmptyState title="Ainda sem faturas" description="Registe a primeira fatura usando o formulário ao lado." />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Nº</Th>
                    <Th>Obra</Th>
                    <Th>Valor</Th>
                    <Th>Prazo</Th>
                    <Th>Estado</Th>
                  </tr>
                </Thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <Tr key={invoice.id}>
                      <Td className="font-medium">
                        <Link href={`/financeiro/${invoice.id}`} className="hover:underline">
                          {invoice.number}
                        </Link>
                      </Td>
                      <Td className="text-graphite-light">{invoice.project?.title ?? "—"}</Td>
                      <Td>{formatEuro(invoice.amount)}</Td>
                      <Td className="text-graphite-light">
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("pt-PT") : "—"}
                      </Td>
                      <Td>
                        <Badge
                          tone={
                            invoice.status === "PAGA" ? "success" : invoice.status === "ATRASADA" ? "danger" : "neutral"
                          }
                        >
                          {INVOICE_STATUS_LABEL[invoice.status as keyof typeof INVOICE_STATUS_LABEL]}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
          <Pagination page={page} totalPages={totalPages} basePath="/financeiro" />
        </Card>

        {canEdit && (
          <Card>
            <CardHeader>
              <h2 className="font-display text-[1.1rem]">Nova Fatura</h2>
            </CardHeader>
            <CardBody>
              <form action={createInvoice} className="flex flex-col gap-4">
                <FieldGroup label="Número da fatura" htmlFor="number">
                  <Input id="number" name="number" required placeholder="Ex.: FT 2026/014" />
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
                <FieldGroup label="Valor (€)" htmlFor="amount">
                  <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
                </FieldGroup>
                <FieldGroup label="Estado" htmlFor="status">
                  <Select id="status" name="status" defaultValue={INVOICE_STATUS.EMITIDA}>
                    {Object.entries(INVOICE_STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <FieldGroup label="Prazo de pagamento" htmlFor="dueDate">
                  <Input id="dueDate" name="dueDate" type="date" />
                </FieldGroup>
                <SubmitButton>Registar Fatura</SubmitButton>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
