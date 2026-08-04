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
import {
  DEAL_STAGE_ORDER,
  DEAL_STAGE_LABEL,
  LEAD_SOURCE,
  LEAD_SOURCE_LABEL,
  PROJECT_TYPE,
  PROJECT_TYPE_LABEL,
  BUDGET_RANGE_LABEL,
} from "@/lib/enums";
import { createDeal, advanceDealStage } from "./actions";
import { Pagination, parsePage, PAGE_SIZE } from "@/components/ui/Pagination";

export const dynamic = "force-dynamic";

export default async function CrmPage({ searchParams }: { searchParams?: { page?: string } }) {
  const user = await requireModuleAccess("crm");
  const canEdit = can(user.role, "crm", "edit");

  const page = parsePage(searchParams);

  const [deals, totalCount, clients] = await Promise.all([
    prisma.deal.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: { select: { id: true, name: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.deal.count(),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true }, take: 500 }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="CRM — Pipeline Comercial"
        description="Leads e negócios, do primeiro contacto ao fecho. Um negócio marcado como Fechado — Ganho gera automaticamente uma obra."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">{totalCount} negócio{totalCount === 1 ? "" : "s"}</h2>
          </CardHeader>
          <CardBody className="p-0">
            {deals.length === 0 ? (
              <EmptyState
                title="Ainda sem negócios"
                description={clients.length === 0 ? "Crie primeiro um cliente em Clientes." : "Adicione o primeiro negócio usando o formulário ao lado."}
              />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Negócio</Th>
                    <Th>Cliente</Th>
                    <Th>Origem</Th>
                    <Th>Valor</Th>
                    <Th>Etapa</Th>
                    {canEdit && <Th>Avançar</Th>}
                  </tr>
                </Thead>
                <tbody>
                  {deals.map((deal) => {
                    const currentIndex = DEAL_STAGE_ORDER.indexOf(deal.stage as (typeof DEAL_STAGE_ORDER)[number]);
                    const nextStage = DEAL_STAGE_ORDER[currentIndex + 1];
                    return (
                      <Tr key={deal.id}>
                        <Td className="font-medium">
                          <Link href={`/crm/${deal.id}`} className="hover:underline">
                            {deal.title}
                          </Link>
                        </Td>
                        <Td>
                          <Link href={`/clientes/${deal.client.id}`} className="hover:underline">
                            {deal.client.name}
                          </Link>
                        </Td>
                        <Td className="text-graphite-light">{LEAD_SOURCE_LABEL[deal.source as keyof typeof LEAD_SOURCE_LABEL]}</Td>
                        <Td>{deal.amount ? `${deal.amount.toLocaleString("pt-PT")} €` : "—"}</Td>
                        <Td>
                          <Badge tone={deal.stage === "FECHADO_GANHO" ? "success" : deal.stage === "FECHADO_PERDIDO" ? "danger" : "neutral"}>
                            {DEAL_STAGE_LABEL[deal.stage as keyof typeof DEAL_STAGE_LABEL]}
                          </Badge>
                        </Td>
                        {canEdit && (
                          <Td>
                            {nextStage ? (
                              <form action={advanceDealStage.bind(null, deal.id)}>
                                <input type="hidden" name="nextStage" value={nextStage} />
                                <button type="submit" className="text-xs font-medium text-gold-text hover:underline">
                                  → {DEAL_STAGE_LABEL[nextStage]}
                                </button>
                              </form>
                            ) : (
                              <span className="text-xs text-graphite-light">—</span>
                            )}
                          </Td>
                        )}
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </CardBody>
          <Pagination page={page} totalPages={totalPages} basePath="/crm" />
        </Card>

        {canEdit && (
          <Card>
            <CardHeader>
              <h2 className="font-display text-[1.1rem]">Novo Negócio</h2>
            </CardHeader>
            <CardBody>
              {clients.length === 0 ? (
                <EmptyState title="Crie um cliente primeiro" description="Um negócio tem sempre de estar associado a um cliente." />
              ) : (
                <form action={createDeal} className="flex flex-col gap-4">
                  <FieldGroup label="Título do negócio" htmlFor="title">
                    <Input id="title" name="title" required placeholder="Ex.: Remodelação T3 — Cascais" />
                  </FieldGroup>
                  <FieldGroup label="Cliente" htmlFor="clientId">
                    <Select id="clientId" name="clientId" required defaultValue="">
                      <option value="" disabled>
                        Selecionar cliente
                      </option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </FieldGroup>
                  <FieldGroup label="Origem do lead" htmlFor="source">
                    <Select id="source" name="source" defaultValue={LEAD_SOURCE.OUTRO}>
                      {Object.entries(LEAD_SOURCE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </FieldGroup>
                  <FieldGroup label="Tipo de projeto" htmlFor="projectType">
                    <Select id="projectType" name="projectType" defaultValue={PROJECT_TYPE.RESIDENCIAL}>
                      {Object.entries(PROJECT_TYPE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </FieldGroup>
                  <FieldGroup label="Faixa de orçamento" htmlFor="budgetRange">
                    <Select id="budgetRange" name="budgetRange" defaultValue="">
                      <option value="">Não definido</option>
                      {Object.entries(BUDGET_RANGE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </FieldGroup>
                  <FieldGroup label="Valor proposto (€)" htmlFor="amount">
                    <Input id="amount" name="amount" type="number" min="0" step="100" />
                  </FieldGroup>
                  <FieldGroup label="Notas de qualificação" htmlFor="notes">
                    <Textarea id="notes" name="notes" rows={3} />
                  </FieldGroup>
                  <SubmitButton>Criar Negócio</SubmitButton>
                </form>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
