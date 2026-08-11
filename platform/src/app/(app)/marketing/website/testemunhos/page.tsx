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
import { createTestimonial, setTestimonialAuthorized, deleteTestimonial } from "../actions";

export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  const user = await requireModuleAccess("marketing");
  const canEdit = can(user.role, "marketing", "edit");

  const [testimonials, caseStudies] = await Promise.all([
    prisma.websiteTestimonial.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.websiteCaseStudy.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Testemunhos do Site"
        description={
          'Um testemunho só é incluído na exportação para o website depois de estar marcado como "Autorizado" — nunca antes. Ver a política em website/src/components/sections/VideoTestimonials.tsx.'
        }
        action={
          <Link href="/marketing/website" className="link-arrow">
            <span className="bar" /> Voltar ao portefólio
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">{testimonials.length} testemunho{testimonials.length === 1 ? "" : "s"}</h2>
          </CardHeader>
          <CardBody className="p-0">
            {testimonials.length === 0 ? (
              <EmptyState
                title="Ainda não há testemunhos registados"
                description="Usa o formulário ao lado assim que tiveres a autorização de um cliente."
              />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Cliente</Th>
                    <Th>Tipo</Th>
                    <Th>Estado</Th>
                    {canEdit && <Th>Ações</Th>}
                  </Tr>
                </Thead>
                <tbody>
                  {testimonials.map((t) => (
                    <Tr key={t.id}>
                      <Td>
                        <div className="font-medium">{t.clientName ?? "(sem nome)"}</div>
                        {t.location && <div className="text-xs text-graphite-light">{t.location}</div>}
                      </Td>
                      <Td>{t.kind === "video" ? "Vídeo" : "Texto"}</Td>
                      <Td>
                        <Badge tone={t.authorized ? "success" : "neutral"}>
                          {t.authorized ? "Autorizado" : "Por autorizar"}
                        </Badge>
                      </Td>
                      {canEdit && (
                        <Td>
                          <div className="flex items-center gap-3">
                            <form
                              action={async () => {
                                "use server";
                                await setTestimonialAuthorized(t.id, !t.authorized);
                              }}
                            >
                              <SubmitButton variant="ghost" pendingLabel="...">
                                {t.authorized ? "Revogar" : "Autorizar"}
                              </SubmitButton>
                            </form>
                            <form
                              action={async () => {
                                "use server";
                                await deleteTestimonial(t.id);
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
        </Card>

        {canEdit && (
          <Card>
            <CardHeader>
              <h2 className="font-display text-[1.1rem]">Novo testemunho</h2>
            </CardHeader>
            <CardBody>
              <form action={createTestimonial} className="flex flex-col gap-4">
                <FieldGroup label="Tipo" htmlFor="kind">
                  <Select id="kind" name="kind" required defaultValue="texto">
                    <option value="texto">Texto</option>
                    <option value="video">Vídeo</option>
                  </Select>
                </FieldGroup>
                <FieldGroup label="Nome do cliente" htmlFor="clientName">
                  <Input id="clientName" name="clientName" maxLength={150} />
                </FieldGroup>
                <FieldGroup label="Localização (zona genérica)" htmlFor="location">
                  <Input id="location" name="location" maxLength={100} />
                </FieldGroup>
                <FieldGroup label="Citação (testemunhos de texto)" htmlFor="quote">
                  <Textarea id="quote" name="quote" rows={4} maxLength={1000} />
                </FieldGroup>
                <FieldGroup label="Link de embed (testemunhos em vídeo)" htmlFor="embedUrl">
                  <Input id="embedUrl" name="embedUrl" />
                </FieldGroup>
                <FieldGroup label="Fotografia (caminho, opcional)" htmlFor="photo">
                  <Input id="photo" name="photo" />
                </FieldGroup>
                <FieldGroup label="Classificação (1-5, opcional)" htmlFor="rating">
                  <Select id="rating" name="rating" defaultValue="">
                    <option value="">—</option>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <FieldGroup label="Obra relacionada (opcional)" htmlFor="caseStudyId">
                  <Select id="caseStudyId" name="caseStudyId" defaultValue="">
                    <option value="">—</option>
                    {caseStudies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <SubmitButton>Guardar testemunho</SubmitButton>
                <p className="text-xs text-graphite-light leading-relaxed">
                  Fica &ldquo;Por autorizar&rdquo; por omissão. Só marca como &ldquo;Autorizado&rdquo; depois de teres confirmação
                  explícita do cliente.
                </p>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
