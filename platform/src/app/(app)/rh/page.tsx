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
import { EMPLOYEE_STATUS, EMPLOYEE_STATUS_LABEL } from "@/lib/enums";
import { createEmployee } from "./actions";
import { Pagination, parsePage, PAGE_SIZE } from "@/components/ui/Pagination";

export const dynamic = "force-dynamic";

export default async function RhPage({ searchParams }: { searchParams?: { page?: string } }) {
  const user = await requireModuleAccess("rh");
  const canEdit = can(user.role, "rh", "edit");

  const page = parsePage(searchParams);
  const [employees, totalCount] = await Promise.all([
    prisma.employee.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.employee.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Recursos Humanos" description="Equipa DS Group — funções, departamentos e estado." />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">{totalCount} colaborador{totalCount === 1 ? "" : "es"}</h2>
          </CardHeader>
          <CardBody className="p-0">
            {employees.length === 0 ? (
              <EmptyState title="Ainda sem colaboradores" description="Adicione o primeiro colaborador usando o formulário ao lado." />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Nome</Th>
                    <Th>Função</Th>
                    <Th>Departamento</Th>
                    <Th>Estado</Th>
                  </tr>
                </Thead>
                <tbody>
                  {employees.map((emp) => (
                    <Tr key={emp.id}>
                      <Td className="font-medium">
                        <Link href={`/rh/${emp.id}`} className="hover:underline">
                          {emp.name}
                        </Link>
                        {emp.email && <div className="text-xs text-graphite-light font-normal">{emp.email}</div>}
                      </Td>
                      <Td>{emp.jobTitle}</Td>
                      <Td className="text-graphite-light">{emp.department ?? "—"}</Td>
                      <Td>
                        <Badge tone={emp.status === "ATIVO" ? "success" : emp.status === "FERIAS" ? "gold" : "neutral"}>
                          {EMPLOYEE_STATUS_LABEL[emp.status as keyof typeof EMPLOYEE_STATUS_LABEL]}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
          <Pagination page={page} totalPages={totalPages} basePath="/rh" />
        </Card>

        {canEdit && (
          <Card>
            <CardHeader>
              <h2 className="font-display text-[1.1rem]">Novo Colaborador</h2>
            </CardHeader>
            <CardBody>
              <form action={createEmployee} className="flex flex-col gap-4">
                <FieldGroup label="Nome" htmlFor="name">
                  <Input id="name" name="name" required />
                </FieldGroup>
                <FieldGroup label="Função" htmlFor="jobTitle">
                  <Input id="jobTitle" name="jobTitle" required placeholder="Ex.: Gestora de Projeto Sénior" />
                </FieldGroup>
                <FieldGroup label="Departamento" htmlFor="department">
                  <Input id="department" name="department" placeholder="Ex.: Operações" />
                </FieldGroup>
                <FieldGroup label="Estado" htmlFor="status">
                  <Select id="status" name="status" defaultValue={EMPLOYEE_STATUS.ATIVO}>
                    {Object.entries(EMPLOYEE_STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <FieldGroup label="Data de início" htmlFor="startDate">
                  <Input id="startDate" name="startDate" type="date" />
                </FieldGroup>
                <FieldGroup label="Email" htmlFor="email">
                  <Input id="email" name="email" type="email" />
                </FieldGroup>
                <FieldGroup label="Telefone" htmlFor="phone">
                  <Input id="phone" name="phone" />
                </FieldGroup>
                <SubmitButton>Adicionar Colaborador</SubmitButton>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
