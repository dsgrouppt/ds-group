import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { FieldGroup, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ROLE, ROLE_LABEL } from "@/lib/enums";
import { createUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function UtilizadoresPage() {
  await requireModuleAccess("definicoes");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 500 });

  return (
    <div>
      <PageHeader
        title="Utilizadores"
        description="Contas de acesso à plataforma DS OS. Cada conta tem um perfil que determina os módulos visíveis."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">{users.length} utilizador{users.length === 1 ? "" : "es"}</h2>
          </CardHeader>
          <CardBody className="p-0">
            <Table>
              <Thead>
                <tr>
                  <Th>Nome</Th>
                  <Th>Perfil</Th>
                  <Th>Estado</Th>
                </tr>
              </Thead>
              <tbody>
                {users.map((u) => (
                  <Tr key={u.id}>
                    <Td>
                      <Link href={`/definicoes/utilizadores/${u.id}`} className="font-medium hover:underline">
                        {u.name}
                      </Link>
                      <div className="text-xs text-graphite-light">{u.email}</div>
                    </Td>
                    <Td>
                      <Badge tone="gold">{ROLE_LABEL[u.role as keyof typeof ROLE_LABEL]}</Badge>
                    </Td>
                    <Td>
                      <Badge tone={u.active ? "success" : "neutral"}>{u.active ? "Ativo" : "Inativo"}</Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Novo Utilizador</h2>
          </CardHeader>
          <CardBody>
            <form action={createUser} className="flex flex-col gap-4">
              <FieldGroup label="Nome" htmlFor="name">
                <Input id="name" name="name" required />
              </FieldGroup>
              <FieldGroup label="Email" htmlFor="email">
                <Input id="email" name="email" type="email" required />
              </FieldGroup>
              <FieldGroup label="Perfil" htmlFor="role">
                <Select id="role" name="role" defaultValue={ROLE.COMERCIAL}>
                  {Object.entries(ROLE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <SubmitButton>Criar Utilizador</SubmitButton>
              <p className="text-xs text-graphite-light">
                A palavra-passe é gerada automaticamente e mostrada uma única vez a seguir a criar a conta.
              </p>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
