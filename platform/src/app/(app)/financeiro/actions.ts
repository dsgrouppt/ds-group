"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { INVOICE_STATUS_LABEL } from "@/lib/enums";
import { parseMoney } from "@/lib/money";

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

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        number: data.number,
        projectId: data.projectId || undefined,
        amount: parseMoney(data.amount, "Valor da fatura"),
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        paidAt: data.status === "PAGA" ? new Date() : undefined,
      },
    });
    await tx.activityLog.create({
      data: { userId: user.id, action: "CREATE", entity: "Invoice", entityId: invoice.id },
    });
  });

  revalidatePath("/financeiro");
  redirect("/financeiro");
}

/**
 * Bug #10 (auditoria Fase C P2, ago/2026): esta funcao lia o estado atual da
 * fatura (`current.paidAt`) e depois escrevia um novo `invoice.update` sem
 * qualquer protecao transacional. Se, entre a leitura e a escrita, alguem
 * registasse um pagamento via `registerPayment` (que tambem altera
 * `status`/`paidAt`), esta escrita "desatualizada" sobrepunha-se ao estado
 * mais recente -- uma fatura paga podia voltar silenciosamente a
 * "EMITIDA", com o Payment (e o dinheiro recebido) a continuar registado,
 * mas invisivel na fatura. Corrigido com `$transaction` em isolamento
 * Serializable: a leitura e a escrita passam a ser atomicas, e se outra
 * transacao (ex.: `registerPayment`) alterar a mesma fatura em paralelo,
 * o Postgres deteta o conflito e rejeita uma das duas com erro P2034 em
 * vez de permitir a perda silenciosa de dados (lost update).
 */
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

  try {
    await prisma.$transaction(
      async (tx) => {
        const current = await tx.invoice.findUnique({ where: { id: invoiceId } });
        if (!current) {
          throw new Error("Fatura não encontrada.");
        }

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            number: data.number,
            projectId: data.projectId || null,
            amount: parseMoney(data.amount, "Valor da fatura"),
            status: data.status,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            paidAt: data.status === "PAGA" ? (current.paidAt ?? new Date()) : null,
          },
        });

        await tx.activityLog.create({
          data: { userId: user.id, action: "UPDATE", entity: "Invoice", entityId: invoiceId },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      throw new Error(
        "Esta fatura foi alterada por outra pessoa entretanto (ex.: um pagamento acabou de ser registado). Recarregue a página e tente novamente."
      );
    }
    throw err;
  }

  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/${invoiceId}`);
}

export async function deleteInvoice(invoiceId: string, formData: FormData) {
  const user = await requireModuleAccess("financeiro");
  void formData;
  if (!can(user.role, "financeiro", "edit")) {
    throw new Error("Sem permissão para apagar faturas.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoice.delete({ where: { id: invoiceId } });
    await tx.activityLog.create({
      data: { userId: user.id, action: "DELETE", entity: "Invoice", entityId: invoiceId },
    });
  });

  revalidatePath("/financeiro");
  redirect("/financeiro");
}

const PaymentSchema = z.object({
  amount: z.string().min(1, "Valor obrigatório"),
  method: z.string().max(60).optional(),
});

/**
 * Bug #9 (identificado em auditoria anterior, corrigido nesta fase, ago/2026):
 * esta funcao fazia `payment.create`, depois lia `invoice.payments` para
 * somar o total pago, e so entao decidia se marcava a fatura como "PAGA" --
 * tres operacoes distintas, nenhuma protegida por transacao.
 *
 * Risco real 1 (crash a meio): se o processo falhasse entre o `payment.create`
 * e o `invoice.update`, o pagamento ficava gravado (dinheiro "recebido" no
 * sistema) mas a fatura continuava a mostrar-se por pagar/em atraso --
 * inconsistencia visivel a qualquer utilizador que consultasse a fatura.
 *
 * Risco real 2 (concorrencia): dois pagamentos parciais registados quase
 * em simultaneo (ex.: dois membros da equipa financeira a processar o
 * mesmo cliente) podiam cada um ler `invoice.payments` sem ver o `create`
 * do outro ainda nao commitado -- ambos calculavam `totalPaid` abaixo do
 * valor da fatura, e a fatura nunca era marcada como paga mesmo que a soma
 * real dos dois pagamentos a cobrisse integralmente.
 *
 * Corrigido com `$transaction` (isolamento Serializable): o `payment.create`,
 * o calculo de `totalPaid` via `tx.payment.aggregate` (executado dentro da
 * mesma transacao, portanto ve o proprio insert) e o `invoice.update`
 * condicional passam a ser atomicos. Em caso de conflito real com outra
 * transacao concorrente sobre a mesma fatura, o Postgres rejeita uma delas
 * com erro P2034 em vez de produzir um resultado silenciosamente incorreto.
 */
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
  const amount = parseMoney(data.amount, "Valor do pagamento");

  try {
    await prisma.$transaction(
      async (tx) => {
        const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice) {
          throw new Error("Fatura não encontrada.");
        }

        await tx.payment.create({
          data: { invoiceId, amount, method: data.method || undefined },
        });

        const { _sum } = await tx.payment.aggregate({
          where: { invoiceId },
          _sum: { amount: true },
        });
        const totalPaid = _sum.amount ?? 0;

        if (totalPaid >= invoice.amount && invoice.status !== "PAGA") {
          await tx.invoice.update({
            where: { id: invoiceId },
            data: { status: "PAGA", paidAt: new Date() },
          });
        }

        await tx.activityLog.create({
          data: { userId: user.id, action: "PAYMENT", entity: "Invoice", entityId: invoiceId },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      throw new Error(
        "Outro pagamento para esta fatura foi registado em simultâneo. Recarregue a página para ver o estado atualizado antes de tentar novamente."
      );
    }
    throw err;
  }

  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/${invoiceId}`);
}
