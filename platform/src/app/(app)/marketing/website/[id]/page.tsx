import Link from "next/link";
import { notFound } from "next/navigation";
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
import { updateCaseStudy, addMediaAsset, deleteMediaAsset } from "../actions";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  residencial: "Residencial",
  premium: "Premium",
  cozinhas: "Cozinhas",
  "casas-de-banho": "Casas de Banho",
  moradias: "Moradias",
  comercial: "Comercial",
};

export default async function EditCaseStudyPage({ params }: { params: { id: string } }) {
  const user = await requireModuleAccess("marketing");
  const canEdit = can(user.role, "marketing", "edit");

  const caseStudy = await prisma.websiteCaseStudy.findUnique({
    where: { id: params.id },
    include: { media: { orderBy: { sortOrder: "asc" } } },
  });
  if (!caseStudy) notFound();

  const updateWithId = updateCaseStudy.bind(null, caseStudy.id);
  const addMediaWithId = addMediaAsset.bind(null, caseStudy.id);

  return (
    <div>
      <PageHeader
        title={caseStudy.title}
        description={`/${caseStudy.slug} · ${CATEGORY_LABEL[caseStudy.category] ?? caseStudy.category} · ${caseStudy.status === "PUBLISHED" ? "Publicado" : "Rascunho"}`}
        action={
          <Link href="/marketing/website" className="link-arrow">
            <span className="bar" /> Voltar ao portefólio
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Detalhes e narrativa</h2>
          </CardHeader>
          <CardBody>
            <form action={updateWithId} className="flex flex-col gap-4">
              <FieldGroup label="Título" htmlFor="title">
                <Input id="title" name="title" required defaultValue={caseStudy.title} maxLength={150} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Categoria" htmlFor="category">
                <Select id="category" name="category" required defaultValue={caseStudy.category} disabled={!canEdit}>
                  {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Localização" htmlFor="location">
                <Input id="location" name="location" required defaultValue={caseStudy.location} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Resumo" htmlFor="summary">
                <Textarea id="summary" name="summary" required rows={3} defaultValue={caseStudy.summary} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Desafio" htmlFor="challenge">
                <Textarea id="challenge" name="challenge" rows={3} defaultValue={caseStudy.challenge ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Planeamento" htmlFor="planning">
                <Textarea id="planning" name="planning" rows={3} defaultValue={caseStudy.planning ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Execução" htmlFor="execution">
                <Textarea id="execution" name="execution" rows={3} defaultValue={caseStudy.execution ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Solução" htmlFor="solution">
                <Textarea id="solution" name="solution" rows={3} defaultValue={caseStudy.solution ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Resultado" htmlFor="result">
                <Textarea id="result" name="result" rows={3} defaultValue={caseStudy.result ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Duração" htmlFor="duration">
                <Input id="duration" name="duration" defaultValue={caseStudy.duration ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="Serviços realizados (slugs, vírgula)" htmlFor="servicesRealized">
                <Input
                  id="servicesRealized"
                  name="servicesRealized"
                  defaultValue={caseStudy.servicesRealized.join(", ")}
                  disabled={!canEdit}
                />
              </FieldGroup>
              <FieldGroup label="Materiais (vírgula)" htmlFor="materials">
                <Input id="materials" name="materials" defaultValue={caseStudy.materials.join(", ")} disabled={!canEdit} />
              </FieldGroup>
              <FieldGroup label="ID da obra interna (Project, opcional)" htmlFor="projectId">
                <Input id="projectId" name="projectId" defaultValue={caseStudy.projectId ?? ""} disabled={!canEdit} />
              </FieldGroup>
              <label className="flex items-center gap-2 text-sm text-graphite">
                <input type="checkbox" name="featured" defaultChecked={caseStudy.featured} disabled={!canEdit} />
                Destacar na homepage
              </label>
              {canEdit && <SubmitButton>Guardar alterações</SubmitButton>}
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Fotos e vídeos ({caseStudy.media.length})</h2>
          </CardHeader>
          <CardBody className="p-0">
            {caseStudy.media.length === 0 ? (
              <EmptyState
                title="Ainda sem media"
                description="Adiciona a capa, a galeria (antes/durante/depois) e os vídeos desta obra abaixo."
              />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Tipo</Th>
                    <Th>Papel</Th>
                    <Th>Origem</Th>
                    {canEdit && <Th>Ações</Th>}
                  </Tr>
                </Thead>
                <tbody>
                  {caseStudy.media.map((m) => (
                    <Tr key={m.id}>
                      <Td>
                        {m.kind === "foto" ? "Foto" : "Vídeo"}
                        {m.phase && <span className="text-xs text-graphite-light block">{m.phase}</span>}
                      </Td>
                      <Td>
                        <Badge tone={m.role === "cover" ? "gold" : "neutral"}>{m.role}</Badge>
                      </Td>
                      <Td className="max-w-[220px] truncate text-xs">{m.src ?? m.embedUrl}</Td>
                      {canEdit && (
                        <Td>
                          <form
                            action={async () => {
                              "use server";
                              await deleteMediaAsset(caseStudy.id, m.id);
                            }}
                          >
                            <SubmitButton variant="ghost" pendingLabel="...">
                              Remover
                            </SubmitButton>
                          </form>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>

          {canEdit && (
            <CardBody className="border-t border-mist-2">
              <form action={addMediaWithId} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <FieldGroup label="Tipo" htmlFor="kind">
                    <Select id="kind" name="kind" required defaultValue="foto">
                      <option value="foto">Foto</option>
                      <option value="video">Vídeo</option>
                    </Select>
                  </FieldGroup>
                  <FieldGroup label="Papel" htmlFor="role">
                    <Select id="role" name="role" required defaultValue="gallery">
                      <option value="cover">Capa</option>
                      <option value="gallery">Galeria</option>
                      <option value="video">Vídeo do processo</option>
                    </Select>
                  </FieldGroup>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FieldGroup label="Fase (se aplicável)" htmlFor="phase">
                    <Select id="phase" name="phase" defaultValue="">
                      <option value="">—</option>
                      <option value="antes">Antes</option>
                      <option value="durante">Durante</option>
                      <option value="depois">Depois</option>
                    </Select>
                  </FieldGroup>
                  <FieldGroup label="Orientação" htmlFor="orientation">
                    <Select id="orientation" name="orientation" defaultValue="">
                      <option value="">—</option>
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                    </Select>
                  </FieldGroup>
                </div>
                <FieldGroup label="Caminho do ficheiro (fotos — ex.: /media/obras/slug/01.jpg)" htmlFor="src">
                  <Input id="src" name="src" />
                </FieldGroup>
                <FieldGroup label="Link de embed (vídeos — YouTube/Vimeo)" htmlFor="embedUrl">
                  <Input id="embedUrl" name="embedUrl" />
                </FieldGroup>
                <FieldGroup label="Texto alternativo — obrigatório para fotos" htmlFor="alt">
                  <Input id="alt" name="alt" maxLength={200} />
                </FieldGroup>
                <FieldGroup label="Legenda (opcional)" htmlFor="caption">
                  <Input id="caption" name="caption" maxLength={200} />
                </FieldGroup>
                <SubmitButton variant="secondary">Adicionar</SubmitButton>
              </form>
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}
