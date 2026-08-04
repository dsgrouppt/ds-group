"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { EMPLOYEE_STATUS_LABEL } from "@/lib/enums";

const EmployeeSchema = z.object({
  name: z.string().min(2, "Nome demasiado curto").max(150),
  jobTitle: z.string().min(2, "Função obrigatória").max(150),
  department: z.string().max(100).optional(),
  status: z.string().max(40),
  startDate: z.string().max(40).optional(),
  email: z.string().email().max(190).optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
});

export async function createEmployee(formData: FormData) {
  const user = await requireModuleAccess("rh");
  if (!can(user.role, "rh", "edit")) {
    throw new Error("Sem permissão para criar colaboradores.");
  }

  const parsed = EmployeeSchema.safeParse({
    name: formData.get("name"),
    jobTitle: formData.get("jobTitle"),
    department: formData.get("department"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  if (!(data.status in EMPLOYEE_STATUS_LABEL)) {
    throw new Error("Estado inválido.");
  }

  await prisma.employee.create({
    data: {
      name: data.name,
      jobTitle: data.jobTitle,
      department: data.department || undefined,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entity: "Employee" } });

  revalidatePath("/rh");
  redirect("/rh");
}

export async function updateEmployee(employeeId: string, formData: FormData) {
  const user = await requireModuleAccess("rh");
  if (!can(user.role, "rh", "edit")) {
    throw new Error("Sem permissão para editar colaboradores.");
  }

  const parsed = EmployeeSchema.safeParse({
    name: formData.get("name"),
    jobTitle: formData.get("jobTitle"),
    department: formData.get("department"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;
  if (!(data.status in EMPLOYEE_STATUS_LABEL)) {
    throw new Error("Estado inválido.");
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      name: data.name,
      jobTitle: data.jobTitle,
      department: data.department || null,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : null,
      email: data.email || null,
      phone: data.phone || null,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entity: "Employee", entityId: employeeId } });

  revalidatePath("/rh");
  redirect("/rh");
}

export async function deleteEmployee(employeeId: string, formData: FormData) {
  const user = await requireModuleAccess("rh");
  void formData;
  if (!can(user.role, "rh", "edit")) {
    throw new Error("Sem permissão para apagar colaboradores.");
  }

  await prisma.employee.delete({ where: { id: employeeId } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "DELETE", entity: "Employee", entityId: employeeId } });

  revalidatePath("/rh");
  redirect("/rh");
}
