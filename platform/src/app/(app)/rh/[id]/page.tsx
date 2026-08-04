import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { FieldGroup, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmButton";
import { EMPLOYEE_STATUS_LABEL } from "@/lib/enums";
import { updateEmployee, deleteEmployee } from "../actions";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const user = await requireModuleAccess("rh");
  const canEdit = can(user.role, "rh", "edit");

  const employee = await prisma.employee.findUnique({ where: { id: params.id } });
  if (!employee) notFound();

  return (
    <div>
      <PageHeader title={employee.name} description={employee.jobTitle} />

      <Card className="max-w-[560px]">
        <CardBody>
          <form action={updateEmployee.bind(null, employee.id)} className="flex flex-col gap-4">
            <FieldGroup label="Nome" htmlFor="name">
              <Input id="name" name="name" defaultValue={employee.name} required disabled={!canEdit} />
            </FieldGroup>
            <FieldGroup label="Função" htmlFor="jobTitle">
              <Input id="jobTitle" name="jobTitle" defaultValue={employee.jobTitle} required disabled={!canEdit} />
            </FieldGroup>
            <FieldGroup label="Departamento" htmlFor="department">
              <Input id="department" name="department" defaultValue={employee.department ?? ""} disabled={!canEdit} />
            </FieldGroup>
            <FieldGroup label="Estado" htmlFor="status">
              <Select id="status" name="status" defaultValue={employee.status} disabled={!canEdit}>
                {Object.entries(EMPLOYEE_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Data de início" htmlFor="startDate">
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={employee.startDate ? employee.startDate.toISOString().slice(0, 10) : ""}
                disabled={!canEdit}
              />
            </FieldGroup>
            <FieldGroup label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={employee.email ?? ""} disabled={!canEdit} />
            </FieldGroup>
            <FieldGroup label="Telefone" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={employee.phone ?? ""} disabled={!canEdit} />
            </FieldGroup>
            {canEdit && <SubmitButton>Guardar Alterações</SubmitButton>}
          </form>

          {canEdit && (
            <form action={deleteEmployee.bind(null, employee.id)} className="mt-4 pt-4 border-t border-mist-2">
              <ConfirmSubmitButton confirmMessage={`Apagar o colaborador "${employee.name}"?`}>Apagar Colaborador</ConfirmSubmitButton>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
