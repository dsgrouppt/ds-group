import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Importação ÚNICA das obras do módulo "Meta 100k" (DS_Meta_100k_dados.json)
 * para o CRM / Negócios existente (sem tabela nova).
 *
 *  - cliente ligado pelo telefone (últimos 9 dígitos); se não existir, é criado;
 *  - se o cliente já tem um negócio sem referência DSR (ex.: lead importada do
 *    Centro de Leads da Meta) esse negócio é ATUALIZADO em vez de duplicado;
 *  - idempotente: o marcador [Meta100k:<id>] nas notas evita reimportar;
 *  - NÃO cria tarefas, NÃO envia mensagens/notificações; só acrescenta/atualiza.
 *  - dataAdj fica nas notas e num ActivityLog "stage=FECHADO_GANHO" com essa
 *    data (convenção já usada pelo dashboard para a data de fecho).
 * Protegido por META_IMPORT_TOKEN (Bearer). Suporta dryRun.
 */

const STAGE: Record<string, string> = {
  pedido: "NOVO_LEAD",
  enviado: "PROPOSTA_ENVIADA",
  negociacao: "EM_NEGOCIACAO",
  adjudicada: "FECHADO_GANHO",
  curso: "FECHADO_GANHO",
  concluida: "FECHADO_GANHO",
  perdida: "FECHADO_PERDIDO",
};
const PROJECT_STAGE: Record<string, string> = {
  adjudicada: "HANDOVER",
  curso: "EXECUCAO",
  concluida: "ENTREGUE",
};
const ORDER = ["NOVO_LEAD", "QUALIFICADO", "VISITA_AGENDADA", "VISITA_REALIZADA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO", "FECHADO_GANHO", "FECHADO_PERDIDO"];

const ObraSchema = z.object({
  id: z.string().max(80),
  cliente: z.string().max(150),
  contacto: z.string().max(40).optional(),
  ref: z.string().max(40).optional(),
  local: z.string().max(200).optional(),
  trabalho: z.string().max(400).optional(),
  valor: z.number().optional(),
  estado: z.string(),
  dataAdj: z.string().max(20).optional(),
  proximo: z.string().max(1000).optional(),
  atualizado: z.string().max(20).optional(),
});
const BodySchema = z.object({ dryRun: z.boolean().default(true), obras: z.array(ObraSchema).max(100) });

const phoneKey = (p?: string | null) => {
  const d = (p || "").replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : d;
};

export async function POST(request: NextRequest) {
  const expected = process.env.META_IMPORT_TOKEN;
  if (!expected) return NextResponse.json({ error: "META_IMPORT_TOKEN em falta." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  let json: unknown;
  try { json = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const { dryRun, obras } = parsed.data;

  const owner =
    (await prisma.user.findFirst({ where: { active: true, role: "ADMIN" }, orderBy: { createdAt: "asc" } })) ??
    (await prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } }));

  const clients = await prisma.client.findMany({ select: { id: true, phone: true } });
  const byPhone = new Map<string, string>();
  for (const c of clients) { const k = phoneKey(c.phone); if (k) byPhone.set(k, c.id); }

  const touchedDealIds = new Set<string>();
  const report = { total: obras.length, created: 0, updated: 0, skippedAlreadyImported: 0, projectsCreated: 0, errors: 0 };
  const details: Array<{ id: string; result: string }> = [];

  for (const o of obras) {
    try {
      const marker = `[Meta100k:${o.id}]`;
      const already = await prisma.deal.findFirst({ where: { notes: { contains: marker } }, select: { id: true } });
      if (already) { report.skippedAlreadyImported++; details.push({ id: o.id, result: "ja_importada" }); continue; }

      const stage = STAGE[o.estado];
      if (!stage) { report.errors++; details.push({ id: o.id, result: `estado_desconhecido:${o.estado}` }); continue; }

      const pk = phoneKey(o.contacto);
      const clientId = pk ? byPhone.get(pk) : undefined;

      // Negócio existente do mesmo cliente a adotar (sem referência DSR e ainda não tocado neste lote)
      let adopt: { id: string; stage: string; notes: string | null } | null = null;
      if (clientId) {
        const cands = await prisma.deal.findMany({
          where: { clientId, stage: { notIn: ["FECHADO_GANHO", "FECHADO_PERDIDO"] } },
          orderBy: { createdAt: "desc" },
          select: { id: true, stage: true, notes: true },
        });
        adopt = cands.find((d) => !touchedDealIds.has(d.id) && !(d.notes || "").includes("[Meta100k:")) ?? null;
      }

      const titleBase = [o.ref, o.trabalho].filter(Boolean).join(" — ") || o.cliente;
      const title = `${titleBase} (${o.cliente})`.slice(0, 250);
      const noteLines = [
        marker,
        o.ref ? `Orçamento: ${o.ref}` : undefined,
        o.local ? `Local: ${o.local}` : undefined,
        o.trabalho ? `Trabalho: ${o.trabalho}` : undefined,
        o.valor ? `Valor (sem IVA): ${o.valor} €` : "Valor: por orçamentar",
        o.dataAdj ? `Data de adjudicação: ${o.dataAdj}` : undefined,
        o.proximo ? `Próxima ação: ${o.proximo}` : undefined,
        o.id === "emilia" ? "ATENÇÃO: 1.190 € calculado a partir dos 40% pagos (com IVA) — confirmar valor sem IVA." : undefined,
        o.atualizado ? `Atualizado (ficheiro Meta 100k): ${o.atualizado}` : undefined,
      ].filter(Boolean).join("\n");

      if (dryRun) {
        if (adopt) report.updated++; else report.created++;
        if (PROJECT_STAGE[o.estado]) report.projectsCreated++;
        details.push({ id: o.id, result: adopt ? `atualizaria_negocio_existente(${adopt.stage}→${stage})` : clientId ? "criaria_negocio_cliente_existente" : "criaria_cliente_e_negocio" });
        continue;
      }

      let cid = clientId;
      if (!cid) {
        const c = await prisma.client.create({ data: { name: o.cliente, phone: o.contacto, type: "FAMILIA" } });
        cid = c.id;
        if (pk) byPhone.set(pk, cid);
      }

      const adjDate = o.dataAdj ? new Date(`${o.dataAdj}T12:00:00Z`) : undefined;
      let dealId: string;
      let finalStage = stage;

      if (adopt) {
        // nunca recuar uma etapa já mais avançada
        if (ORDER.indexOf(adopt.stage) > ORDER.indexOf(stage)) finalStage = adopt.stage;
        await prisma.deal.update({
          where: { id: adopt.id },
          data: {
            title,
            stage: finalStage,
            amount: o.valor ? o.valor : undefined,
            propostaEnviadaAt: finalStage === "PROPOSTA_ENVIADA" || finalStage === "EM_NEGOCIACAO" ? new Date() : undefined,
            notes: `${adopt.notes ? adopt.notes + "\n\n" : ""}${noteLines}`,
          },
        });
        dealId = adopt.id;
        report.updated++;
      } else {
        const d = await prisma.deal.create({
          data: {
            title,
            clientId: cid,
            stage: finalStage,
            source: "OUTRO",
            amount: o.valor ? o.valor : undefined,
            ownerId: owner?.id,
            notes: noteLines,
          },
        });
        dealId = d.id;
        report.created++;
      }
      touchedDealIds.add(dealId);

      await prisma.activityLog.create({
        data: { userId: owner?.id, action: "UPDATE", entity: "Deal", entityId: dealId, meta: "source=meta100k-import" },
      });
      if (finalStage === "FECHADO_GANHO") {
        await prisma.activityLog.create({
          data: {
            userId: owner?.id, action: "STAGE_CHANGE", entity: "Deal", entityId: dealId, meta: "stage=FECHADO_GANHO",
            ...(adjDate ? { createdAt: adjDate } : {}),
          },
        });
        if (PROJECT_STAGE[o.estado]) {
          const exists = await prisma.project.findUnique({ where: { dealId } });
          if (!exists) {
            await prisma.project.create({
              data: {
                title, clientId: cid, dealId, stage: PROJECT_STAGE[o.estado], location: o.local,
                budgetAmount: o.valor ? o.valor : undefined, ownerId: owner?.id,
              },
            });
            report.projectsCreated++;
          }
        }
      }
      details.push({ id: o.id, result: adopt ? "atualizado" : "criado" });
    } catch (err) {
      report.errors++;
      details.push({ id: o.id, result: `erro: ${err instanceof Error ? err.message.slice(0, 160) : "desconhecido"}` });
    }
  }

  return NextResponse.json({ ok: true, dryRun, report, details });
}
