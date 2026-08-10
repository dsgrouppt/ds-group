"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { CLIENT_TYPE } from "@/lib/enums";

const ClientSchema = z.object({
  name: z.string().min(2, "Nome demasiado curto").max(150),
  email: z.string().email().max(190).optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  type: z.enum([CLIENT_TYPE.FAMILIA, CLIENT_TYPE.INVESTIDOR, CLIENT_TYPE.ARQUITETO_PARCEIRO]),
  location: z.string().max(150).optional(),
  notes: z.string().max(5000).optional(),
});

export async function createClient(formData: FormData) {
  const user = await requireModuleAccess("clientes");
  if (!can(user.role, "clientes", "edit")) {
    throw new Error("Sem permissão para criar clientes.");
  }

  const parsed = ClientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    type: formData.get("type"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const data = parsed.data;

  await prisma.client.create({
    data: {
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      type: data.type,
      location: data.location || undefined,
      notes: data.notes || undefined,
    },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: "CREATE", entity: "Client" },
  });

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function updateClient(clientId: string, formData: FormData) {
  const user = await requireModuleAccess("clientes");
  if (!can(user.role, "clientes", "edit")) {
    throw new Error("Sem permissão para editar clientes.");
  }

  const parsed = ClientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    type: formData.get("type"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      type: data.type,
      location: data.location || null,
      notes: data.notes || null,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entity: "Client", entityId: clientId } });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
}

/**
 * Bug #13 (auditoria Fase C P2, ago/2026): a contagem de negocios/obras
 * associadas (guard que impede apagar um cliente "em uso") corria com
 * `Promise.all` -- que executa os dois `count()` em paralelo mas NAO os
 * protege de escritas concorrentes; e o resultado era usado para decidir
 * um `delete` fora de qualquer transacao. Risco MEDIUM: um Deal ou Project
 * podia ser criado para este cliente exatamente na janela entre a
 * contagem e o delete. O schema exige `clientId` obrigatorio em Deal e
 * Project, por isso o cenario mais provavel e o Postgres rejeitar o
 * delete com erro de FK (falha ruidosa, nao corrupcao silenciosa) — mas a
 * janela de inconsistencia existia. Corrigido movendo as contagens para
 * dentro da mesma `$transaction` que o delete.
 */
export async function deleteClient(clientId: string, formData: FormData) {
  const user = await requireModuleAccess("clientes");
  void formData;
  if (!can(user.role, "clientes", "edit")) {
    throw new Error("Sem permissão para apagar clientes.");
  }

  await prisma.$transaction(async (tx) => {
    const [dealCount, projectCount] = await Promise.all([
      tx.deal.count({ where: { clientId } }),
      tx.project.count({ where: { clientId } }),
    ]);
    if (dealCount > 0 || projectCount > 0) {
      throw new Error("Não é possível apagar um cliente com negócios ou obras associadas.");
    }

    await tx.client.delete({ where: { id: clientId } });
    await tx.activityLog.create({
      data: { userId: user.id, action: "DELETE", entity: "Client", entityId: clientId },
    });
  });

  revalidatePath("/clientes");
  redirect("/clientes");
}


// ─────────────────────────────────────────────────────────────────────────
// PORTAL DO CLIENTE — ativação e gestão de acesso
// ─────────────────────────────────────────────────────────────────────────
// A equipa define aqui a password inicial (ou uma nova, em caso de reposição)
// e comunica-a ao cliente por um canal já confiável (telefone, email direto)
// — não existe ainda envio automático de convite (ver docs/pendencias-tecnicas.md).

const PortalPasswordSchema = z.object({
  password: z.string().min(8, "A password tem de ter pelo menos 8 caracteres.").max(72),
});

/**
 * Bug #14 (auditoria Fase C P2, ago/2026 — HIGH): o proprio comentario do
 * codigo ja documentava a intencao de bloquear "na origem" dois clientes
 * com portal ativo a partilhar o mesmo email — mas a verificacao
 * (`emailConflict`) e a escrita (`client.update`) eram dois pedidos
 * separados, sem transacao (classico TOCTOU — time-of-check to
 * time-of-use). Risco real: dois pedidos de ativacao de portal para dois
 * registos de Client diferentes com o mesmo email, disparados quase em
 * simultaneo, podiam ambos ler "sem conflito" (nenhum dos dois via o
 * outro ainda por commitar) e ambos avancar para `portalActive: true` —
 * produzindo exatamente a situacao que o guard deveria impedir: dois
 * clientes ativos a partilhar login por email, tornando o acesso ao
 * portal nao-deterministico (um cliente podia autenticar e ver
 * mensagens/documentos da obra errada).
 *
 * Corrigido com `$transaction` em isolamento Serializable: a verificacao
 * e a escrita passam a ser atomicas dentro da mesma transacao, e se duas
 * transacoes concorrentes tentarem o mesmo email, o Postgres deteta o
 * conflito e forca uma delas a falhar com erro P2034 em vez de deixar as
 * duas passarem.
 */
export async function activateClientPortal(clientId: string, formData: FormData) {
  const user = await requireModuleAccess("clientes");
  if (!can(user.role, "clientes", "edit")) {
    throw new Error("Sem permissão para gerir o acesso ao portal.");
  }

  const parsed = PortalPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Password inválida.");
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    await prisma.$transaction(
      async (tx) => {
        const client = await tx.client.findUnique({ where: { id: clientId }, select: { email: true } });
        if (!client?.email) {
          throw new Error(
            "Este cliente não tem email registado — não é possível ativar o acesso ao portal sem um email para login."
          );
        }

        // O login do portal identifica o cliente só pelo email (Client.email não
        // é único na base de dados — dois registos podem partilhar o mesmo
        // contacto de propósito, ex. duas obras da mesma família). Isso é
        // inofensivo até os DOIS terem o portal ativo com o mesmo email: nesse
        // caso o login deixaria de ser determinístico. Bloqueado aqui, na
        // origem, em vez de só na autenticação.
        const emailConflict = await tx.client.findFirst({
          where: { email: client.email, portalActive: true, id: { not: clientId } },
          select: { id: true, name: true },
        });
        if (emailConflict) {
          throw new Error(
            `Já existe outro cliente ("${emailConflict.name}") com acesso ao portal ativo usando este mesmo email. Desative o acesso desse cliente primeiro, ou corrija o email antes de continuar.`
          );
        }

        await tx.client.update({
          where: { id: clientId },
          data: { passwordHash, portalActive: true, passwordChangedAt: new Date() },
        });

        await tx.activityLog.create({
          data: {
            userId: user.id,
            action: "UPDATE",
            entity: "ClientPortalAccess",
            entityId: clientId,
            meta: "ativado/password redefinida",
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      throw new Error(
        "Outra alteração ao acesso do portal deste cliente (ou de um cliente com o mesmo email) ocorreu em simultâneo. Tente novamente."
      );
    }
    throw err;
  }

  revalidatePath(`/clientes/${clientId}`);
}

export async function deactivateClientPortal(clientId: string, formData: FormData) {
  const user = await requireModuleAccess("clientes");
  void formData;
  if (!can(user.role, "clientes", "edit")) {
    throw new Error("Sem permissão para gerir o acesso ao portal.");
  }

  await prisma.client.update({ where: { id: clientId }, data: { portalActive: false } });

  await prisma.activityLog.create({
    data: { userId: user.id, action: "UPDATE", entity: "ClientPortalAccess", entityId: clientId, meta: "desativado" },
  });

  revalidatePath(`/clientes/${clientId}`);
}
