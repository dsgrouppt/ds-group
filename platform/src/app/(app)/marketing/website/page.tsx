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
import { Pagination, parsePage, PAGE_SIZE } from "@/components/ui/Pagination";
import { createCaseStudy, setCaseStudyStatus, deleteCaseStudy } from "./actions";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  residencial: "Residencial",
  premium: "Premium",
  cozinhas: "Cozinhas",
  "casas-de-banho": "Casas de Banho",
  moradias: "Moradias",
  comercial: "Comercial",
};

export default async function WebsitePortfolioPage({ searchParams }: { searchParams?: { page?: string } }) {
  const user = await requireModuleAccess("marketing");
  const canEdit = can(user.role, "marketing", "edit");

  const page = parsePage(searchParams);

  const [caseStudies, totalCount] = await Promise.all([
    prisma.websiteCaseStudy.findMany({
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.websiteCaseStudy.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const publishedCount = await prisma.websiteCaseStudy.count({ where: { status: "PUBLISHED" } });

  return (
    <div>
      <PageHeader
        title="Site — Portefólio"
        description="Obras a publicar no portefólio do website (dsprojects.pt). Rascunho até estares pronto — nunca aparece no site enquanto não passar a Publicado e for exportado. Ver docs/website-cms-integracao.md."
        action={
          publishedCount > 0 ? (
            <Link href="/api/marketing/website/export" className="link-arrow" target="_blank">
              <span className="bar" /> Exportar conteúdo publicado ({publishedCount})
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-display text-[1.1rem]">{totalCount} obra{totalCount === 1 ? "" : "s"}</h2>
            <Link href="/marketing/website/testemunhos" className="link-arrow text-sm">
              <span className="bar" /> Gerir testemunhos
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {caseStudies.length === 0 ? (
              <EmptyState
                title="Ainda não há nenhuma obra criada"
                description="Usa o formulário ao lado para criar a primeira ficha de obra para o portefólio do site."
              />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Obra</Th>
                    <Th>Categoria</Th>
                    <Th>Localização</Th>
                    <Th>Estado</Th>
                    {canEdit && <Th>Ações</Th>}
                  </Tr>
                </Thead>
                <tbody>
                  {caseStudies.map((c) => (
                    <Tr key={c.id}>
                      <Td>
                        <Link href={`/marketing/website/${c.id}`} className="font-medium hover:underline">
                          {c.title}
                        </Link>
                        <div className="text-xs text-graphite-light mt-0.5">/{c.slug}</div>
                      </Td>
                      <Td>{CATEGORY_LABEL[c.category] ?? c.category}</Td>
                      <Td>{c.location}</Td>
                      <Td>
                        <Badge tone={c.status === "PUBLISHED" ? "success" : "neutral"}>
                          {c.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
                        </Badge>
                      </Td>
                      {canEdit && (
                        <Td>
                          <div className="flex items-center gap-3">
                            <form
                              action={async () => {
                                "use server";
                                await setCaseStudyStatus(c.id, c.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED");
                              }}
                            >
                              <SubmitButton variant="ghost" pendingLabel="...">
                                {c.status === "PUBLISHED" ? "Despublicar" : "Publicar"}
                              </SubmitButton>
                            </form>
                            <form
                              action={async () => {
                                "use server";
                                await deleteCaseStudy(c.id);
                              }}
                            >
                              <SubmitButton variant="ghost" pendingLabel="...">
                                Eliminar
                              </SubmitButton>
                            </form>
                          </div>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
          <Pagination page={page} totalPages={totalPages} basePath="/marketing/website" />
        </Card>

        {canEdit && (
          <Card>
            <CardHeader>
              <h2 className="font-display text-[1.1rem]">Nova obra</h2>
            </CardHeader>
            <CardBody>
              <form action={createCaseStudy} className="flex flex-col gap-4">
                <FieldGroup label="Slug (URL, ex.: remodelacao-cascais-01)" htmlFor="slug">
                  <Input id="slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
                </FieldGroup>
                <FieldGroup label="Título" htmlFor="title">
                  <Input id="title" name="title" required maxLength={150} />
                </FieldGroup>
                <FieldGroup label="Categoria" htmlFor="category">
                  <Select id="category" name="category" required defaultValue="">
                    <option value="" disabled>
                      Selecionar
                    </option>
                    {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <FieldGroup label="Localização (concelho/zona)" htmlFor="location">
                  <Input id="location" name="location" required maxLength={100} />
                </FieldGroup>
                <FieldGroup label="Resumo (aparece no cartão do portefólio)" htmlFor="summary">
                  <Textarea id="summary" name="summary" required rows={3} maxLength={500} />
                </FieldGroup>
                <FieldGroup label="Serviços realizados (slugs separados por vírgula)" htmlFor="servicesRealized">
                  <Input id="servicesRealized" name="servicesRealized" placeholder="cozinhas, casas-de-banho" />
                </FieldGroup>
                <FieldGroup label="Duração (opcional)" htmlFor="duration">
                  <Input id="duration" name="duration" placeholder="ex.: 10 semanas" />
                </FieldGroup>
                <FieldGroup label="Materiais (opcional, separados por vírgula)" htmlFor="materials">
                  <Input id="materials" name="materials" />
                </FieldGroup>
                <FieldGroup label="ID da obra interna (opcional — liga a um Project real)" htmlFor="projectId">
                  <Input id="projectId" name="projectId" placeholder="cuid do Project, se aplicável" />
                </FieldGroup>
                <label className="flex items-center gap-2 text-sm text-graphite">
                  <input type="checkbox" name="featured" />
                  Destacar na homepage
                </label>
                <SubmitButton>Criar obra (rascunho)</SubmitButton>
                <p className="text-xs text-graphite-light leading-relaxed">
                  Depois de criada, abre a obra para preencher a narrativa completa (Desafio, Planeamento,
                  Execução, Solução, Resultado) e a galeria de fotos/vídeos.
                </p>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
