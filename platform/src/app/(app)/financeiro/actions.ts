"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { INVOICE_STATUS_LABEL } from "@/lib/enums";

const InvoiceSchema = z.object({
  number: z.string().min(1, "Número de fatura obrigatório").max(60),
  projectId: z.string().max(50).optional(),
  amount: z.string().min(1, "Valor obrigatório").max(30),
  status: z.string().max(40),
  dueDate: z.string().max(40).optional(),
});

export async function createInvoice(formData: FormData) {
  const user = await requireModuleAccess("financeiro");
  if (!can(user.role, "financeiro", "edit")) {
    throw new Error("Sem permissão para criar faturas.");
  }

  const parsed = InvoiceSchema.safeParse({
    number: formData.get("number"),
    projectId: formData.get("projectId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  if (!(data.status in INVOICE_STATUS_LABEL)) {
    throw new Error("Estado de fatura inválido.");
  }

  await prisma.invoice.create({
    data: {
      number: data.number,
      projectId: data.projectId || undefined,
      amount: Number(data.amount),
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      paidAt: data.status === "PAGA" ? new Date() : undefined,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entity: "Invoice" } });

  revalidatePath("/financeiro");
  redirect("/financeiro");
}

export async function updateInvoice(invoiceId: string, formData: FormData) {
  const user = await requireModuleAccess("financeiro");
  if (!can(user.role, "financeiro", "edit")) {
    throw new Error("Sem permissão para editar faturas.");
  }

  const parsed = InvoiceSchema.safeParse({
    number: formData.get("number"),
    projectId: formData.get("projectId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;
  if (!(data.status in INVOICE_STATUS_LABEL)) {
    throw new Error("Estado de fatura inválido.");
  }

  const current = await prisma.invoice.findUnique({ where: { id: invoiceId } });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      number: data.number,
      projectId: data.projectId || null,
      amount: Number(data.amount),
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      paidAt: data.status === "PAGA" ? (current?.paidAt ?? new Date()) : null,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entity: "Invoice", entityId: invoiceId } });

  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/${invoiceId}`);
}

export async function deleteInvoice(invoiceId: string, formData: FormData) {
  const user = await requireModuleAccess("financeiro");
  void formData;
  if (!can(user.role, "financeiro", "edit")) {
    throw new Error("Sem permissão para apagar faturas.");
  }

  await prisma.invoice.delete({ where: { id: invoiceId } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "DELETE", entity: "Invoice", entityId: invoiceId } });

  revalidatePath("/financeiro");
  redirect("/financeiro");
}

const PaymentSchema = z.object({
  amount: z.string().min(1, "Valor obrigatório"),
  method: z.string().max(60).optional(),
});

export async function registerPayment(invoiceId: string, formData: FormData) {
  const user = await requireModuleAccess("financeiro");
  if (!can(user.role, "financeiro", "edit")) {
    throw new Error("Sem permissão para registar pagamentos.");
  }

  const parsed = PaymentSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  await prisma.payment.create({
    data: { invoiceId, amount: Number(data.amount), method: data.method || undefined },
  });

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
  if (invoice) {
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid >= invoice.amount) {
      await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "PAGA", paidAt: new Date() } });
    }
  }

  await prisma.activityLog.create({ data: { userId: user.id, action: "PAYMENT", entity: "Invoice", entityId: invoiceId } });

  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/${invoiceId}`);
}
