import type { Metadata } from "next";
import { requireClient } from "@/lib/client-session";
import { getClientInvoices } from "@/lib/portal-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { INVOICE_STATUS_LABEL, type InvoiceStatusValue } from "@/lib/enums";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagamentos" };

const STATUS_TONE: Record<InvoiceStatusValue, "neutral" | "gold" | "danger" | "success"> = {
  EMITIDA: "gold",
  PAGA: "success",
  ATRASADA: "danger",
  CANCELADA: "neutral",
};

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export default async function PortalPagamentosPage() {
  const client = await requireClient();
  const invoices = await getClientInvoices(client.id);

  const totalPaid = invoices.reduce((sum, inv) => sum + inv.payments.reduce((s, p) => s + p.amount, 0), 0);
  const totalDue = invoices.reduce((sum, inv) => sum + inv.amount, 0) - totalPaid;

  return (
    <div>
      <PageHeader title="Pagamentos" description="Faturas emitidas e pagamentos registados para a sua obra." />

      {invoices.length === 0 ? (
        <Card>
          <EmptyState title="Sem faturas emitidas" description="As faturas relativas à sua obra vão aparecer aqui à medida que forem emitidas." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            <Card>
              <CardBody>
                <div className="text-xs font-medium text-graphite-light uppercase tracking-wide mb-2">Total pago</div>
                <div className="font-display text-[1.6rem]">{formatCurrency(totalPaid)}</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-xs font-medium text-graphite-light uppercase tracking-wide mb-2">Saldo em aberto</div>
                <div className="font-display text-[1.6rem]">{formatCurrency(Math.max(totalDue, 0))}</div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody className="p-0">
              <Table>
                <Thead>
                  <tr>
                    <Th>Fatura</Th>
                    <Th>Data de emissão</Th>
                    <Th>Vencimento</Th>
                    <Th>Valor</Th>
                    <Th>Estado</Th>
                  </tr>
                </Thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <Tr key={invoice.id}>
                      <Td className="font-medium">{invoice.number}</Td>
                      <Td>{formatDate(invoice.issueDate)}</Td>
                      <Td>{formatDate(invoice.dueDate)}</Td>
                      <Td>{formatCurrency(invoice.amount)}</Td>
                      <Td>
                        <Badge tone={STATUS_TONE[invoice.status as InvoiceStatusValue] ?? "neutral"}>
                          {INVOICE_STATUS_LABEL[invoice.status as InvoiceStatusValue] ?? invoice.status}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
