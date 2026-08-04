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
import { CAMPAIGN_CHANNEL, CAMPAIGN_CHANNEL_LABEL, LEAD_SOURCE_LABEL } from "@/lib/enums";
import { createCampaign } from "./actions";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const user = await requireModuleAccess("marketing");
  const canEdit = can(user.role, "marketing", "edit");

  const [campaigns, leadsBySource] = await Promise.all([
    prisma.marketingCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.deal.groupBy({ by: ["source"], _count: { source: true } }),
  ]);

  const totalLeads = leadsBySource.reduce((sum, row) => sum + row._count.source, 0);

  return (
    <div>
      <PageHeader
        title="Marketing"
        description="Campanhas ativas e origem real dos leads captados no CRM — a base do ROI de marketing (docs/crm-especificacao.md §7)."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Leads por Origem</h2>
          </CardHeader>
          <CardBody className="p-0">
            {totalLeads === 0 ? (
              <EmptyState title="Ainda sem negócios no CRM" description="Assim que houver negócios, a origem aparece aqui automaticamente." />
            ) : (
              <ul className="divide-y divide-mist-2">
                {leadsBySource
                  .sort((a, b) => b._count.source - a._count.source)
                  .map((row) => (
                    <li key={row.source} className="px-6 py-3.5 flex items-center justify-between">
                      <span className="text-sm">{LEAD_SOURCE_LABEL[row.source as keyof typeof LEAD_SOURCE_LABEL]}</span>
                      <span className="text-sm font-medium">
                        {row._count.source} · {Math.round((row._count.source / totalLeads) * 100)}%
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">{campaigns.length} campanha{campaigns.length === 1 ? "" : "s"}</h2>
          </CardHeader>
          <CardBody className="p-0">
            {campaigns.length === 0 ? (
              <EmptyState title="Ainda sem campanhas" description="Registe a primeira campanha no formulário abaixo." />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Nome</Th>
                    <Th>Canal</Th>
                    <Th>Estado</Th>
                  </tr>
                </Thead>
                <tbody>
                  {campaigns.map((c) => (
                    <Tr key={c.id}>
                      <Td className="font-medium">
                        <Link href={`/marketing/${c.id}`} className="hover:underline">
                          {c.name}
                        </Link>
                      </Td>
                      <Td className="text-graphite-light">{CAMPAIGN_CHANNEL_LABEL[c.channel as keyof typeof CAMPAIGN_CHANNEL_LABEL]}</Td>
                      <Td>
                        <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Ativa" : "Terminada"}</Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>

      {canEdit && (
        <Card className="max-w-[560px]">
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Nova Campanha</h2>
          </CardHeader>
          <CardBody>
            <form action={createCampaign} className="flex flex-col gap-4">
              <FieldGroup label="Nome" htmlFor="name">
                <Input id="name" name="name" required placeholder="Ex.: Google Ads — Remodelação Lisboa" />
              </FieldGroup>
              <FieldGroup label="Canal" htmlFor="channel">
                <Select id="channel" name="channel" defaultValue={CAMPAIGN_CHANNEL.OUTRO}>
                  {Object.entries(CAMPAIGN_CHANNEL_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Orçamento (€)" htmlFor="budget">
                <Input id="budget" name="budget" type="number" min="0" step="10" />
              </FieldGroup>
              <FieldGroup label="Início" htmlFor="startDate">
                <Input id="startDate" name="startDate" type="date" />
              </FieldGroup>
              <FieldGroup label="Fim" htmlFor="endDate">
                <Input id="endDate" name="endDate" type="date" />
              </FieldGroup>
              <FieldGroup label="Notas" htmlFor="notes">
                <Textarea id="notes" name="notes" rows={2} />
              </FieldGroup>
              <SubmitButton>Criar Campanha</SubmitButton>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
