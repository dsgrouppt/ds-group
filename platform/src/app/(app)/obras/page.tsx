import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { FieldGroup, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PROJECT_STAGE_ORDER, PROJECT_STAGE_LABEL, PROJECT_TYPE, PROJECT_TYPE_LABEL } from "@/lib/enums";
import { createProject, advanceProjectStage } from "./actions";
import { Pagination, parsePage, PAGE_SIZE } from "@/components/ui/Pagination";

export const dynamic = "force-dynamic";

export default async function ObrasPage({ searchParams }: { searchParams?: { page?: string } }) {
  const user = await requireModuleAccess("obras");
  const canEdit = can(user.role, "obras", "edit");

  const page = parsePage(searchParams);

  const [projects, totalCount, clients] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: { select: { id: true, name: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.project.count(),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true }, take: 500 }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Obras — Pipeline de Projeto"
        description="Obras em curso, do handover pós-venda à garantia ativa. Ver docs/crm-especificacao.md §4."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">{totalCount} obra{totalCount === 1 ? "" : "s"}</h2>
          </CardHeader>
          <CardBody className="p-0">
            {projects.length === 0 ? (
              <EmptyState
                title="Ainda sem obras"
                description="Uma obra é criada automaticamente quando um negócio no CRM passa a Fechado — Ganho, ou manualmente aqui."
              />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Obra</Th>
                    <Th>Cliente</Th>
                    <Th>Tipo</Th>
                    <Th>Prazo</Th>
                    <Th>Etapa</Th>
                    {canEdit && <Th>Avançar</Th>}
                  </tr>
                </Thead>
                <tbody>
                  {projects.map((project) => {
                    const currentIndex = PROJECT_STAGE_ORDER.indexOf(project.stage as (typeof PROJECT_STAGE_ORDER)[number]);
                    const nextStage = PROJECT_STAGE_ORDER[currentIndex + 1];
                    return (
                      <Tr key={project.id}>
                        <Td className="font-medium">
                          <Link href={`/obras/${project.id}`} className="hover:underline">
                            {project.title}
                          </Link>
                        </Td>
                        <Td>
                          <Link href={`/clientes/${project.client.id}`} className="hover:underline">
                            {project.client.name}
                          </Link>
                        </Td>
                        <Td className="text-graphite-light">
                          {PROJECT_TYPE_LABEL[project.serviceType as keyof typeof PROJECT_TYPE_LABEL]}
                        </Td>
                        <Td className="text-graphite-light">
                          {project.dueDate ? new Date(project.dueDate).toLocaleDateString("pt-PT") : "—"}
                        </Td>
                        <Td>
                          <Badge tone={project.stage === "ENTREGUE" || project.stage === "POS_OBRA_GARANTIA" ? "success" : "neutral"}>
                            {PROJECT_STAGE_LABEL[project.stage as keyof typeof PROJECT_STAGE_LABEL]}
                          </Badge>
                        </Td>
                        {canEdit && (
                          <Td>
                            {nextStage ? (
                              <form action={advanceProjectStage.bind(null, project.id)}>
                                <input type="hidden" name="nextStage" value={nextStage} />
                                <button type="submit" className="text-xs font-medium text-gold-text hover:underline">
                                  → {PROJECT_STAGE_LABEL[nextStage]}
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
          <Pagination page={page} totalPages={totalPages} basePath="/obras" />
        </Card>

        {canEdit && (
          <Card>
            <CardHeader>
              <h2 className="font-display text-[1.1rem]">Nova Obra</h2>
            </CardHeader>
            <CardBody>
              {clients.length === 0 ? (
                <EmptyState title="Crie um cliente primeiro" description="Uma obra tem sempre de estar associada a um cliente." />
              ) : (
                <form action={createProject} className="flex flex-col gap-4">
                  <FieldGroup label="Título da obra" htmlFor="title">
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
                  <FieldGroup label="Tipo de serviço" htmlFor="serviceType">
                    <Select id="serviceType" name="serviceType" defaultValue={PROJECT_TYPE.RESIDENCIAL}>
                      {Object.entries(PROJECT_TYPE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </FieldGroup>
                  <FieldGroup label="Localização" htmlFor="location">
                    <Input id="location" name="location" />
                  </FieldGroup>
                  <FieldGroup label="Data de início" htmlFor="startDate">
                    <Input id="startDate" name="startDate" type="date" />
                  </FieldGroup>
                  <FieldGroup label="Prazo previsto" htmlFor="dueDate">
                    <Input id="dueDate" name="dueDate" type="date" />
                  </FieldGroup>
                  <FieldGroup label="Orçamento (€)" htmlFor="budgetAmount">
                    <Input id="budgetAmount" name="budgetAmount" type="number" min="0" step="100" />
                  </FieldGroup>
                  <SubmitButton>Criar Obra</SubmitButton>
                </form>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
