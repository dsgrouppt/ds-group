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
import { CLIENT_TYPE, CLIENT_TYPE_LABEL } from "@/lib/enums";
import { createClient } from "./actions";
import { Pagination, parsePage, PAGE_SIZE } from "@/components/ui/Pagination";

export const dynamic = "force-dynamic";

export default async function ClientesPage({ searchParams }: { searchParams?: { page?: string } }) {
  const user = await requireModuleAccess("clientes");
  const canEdit = can(user.role, "clientes", "edit");

  const page = parsePage(searchParams);

  const [clients, totalCount] = await Promise.all([
    prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { deals: true, projects: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.client.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Base única de clientes — famílias, investidores e arquitetos parceiros. Cada negócio e cada obra referencia um cliente aqui."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">{totalCount} cliente{totalCount === 1 ? "" : "s"}</h2>
          </CardHeader>
          <CardBody className="p-0">
            {clients.length === 0 ? (
              <EmptyState
                title="Ainda sem clientes"
                description="Adicione o primeiro cliente usando o formulário ao lado."
              />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Nome</Th>
                    <Th>Tipo</Th>
                    <Th>Contacto</Th>
                    <Th>Negócios</Th>
                    <Th>Obras</Th>
                  </tr>
                </Thead>
                <tbody>
                  {clients.map((client) => (
                    <Tr key={client.id}>
                      <Td>
                        <Link href={`/clientes/${client.id}`} className="font-medium hover:underline">
                          {client.name}
                        </Link>
                        {client.location && <div className="text-xs text-graphite-light">{client.location}</div>}
                      </Td>
                      <Td>
                        <Badge tone="gold">{CLIENT_TYPE_LABEL[client.type as keyof typeof CLIENT_TYPE_LABEL]}</Badge>
                      </Td>
                      <Td className="text-graphite-light">
                        {client.email && <div>{client.email}</div>}
                        {client.phone && <div>{client.phone}</div>}
                        {!client.email && !client.phone && "—"}
                      </Td>
                      <Td>{client._count.deals}</Td>
                      <Td>{client._count.projects}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
          <Pagination page={page} totalPages={totalPages} basePath="/clientes" />
        </Card>

        {canEdit && (
          <Card>
            <CardHeader>
              <h2 className="font-display text-[1.1rem]">Novo Cliente</h2>
            </CardHeader>
            <CardBody>
              <form action={createClient} className="flex flex-col gap-4">
                <FieldGroup label="Nome" htmlFor="name">
                  <Input id="name" name="name" required />
                </FieldGroup>
                <FieldGroup label="Tipo de Cliente" htmlFor="type">
                  <Select id="type" name="type" defaultValue={CLIENT_TYPE.FAMILIA}>
                    {Object.entries(CLIENT_TYPE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <FieldGroup label="Email" htmlFor="email">
                  <Input id="email" name="email" type="email" />
                </FieldGroup>
                <FieldGroup label="Telefone" htmlFor="phone">
                  <Input id="phone" name="phone" />
                </FieldGroup>
                <FieldGroup label="Localização do imóvel" htmlFor="location">
                  <Input id="location" name="location" placeholder="Ex.: Cascais" />
                </FieldGroup>
                <FieldGroup label="Notas de qualificação" htmlFor="notes">
                  <Textarea id="notes" name="notes" rows={3} />
                </FieldGroup>
                <SubmitButton>Guardar Cliente</SubmitButton>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
