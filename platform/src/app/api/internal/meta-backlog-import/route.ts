import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LEAD_SOURCE } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Importação ÚNICA do backlog de leads do Centro de Leads da Meta (CSV),
 * quando o webhook automático esteve parado (conta de programador bloqueada).
 *
 * Diferenças deliberadas face a /api/internal/lead-intake:
 *  - origem META_LEAD_ADS (não SITE);
 *  - NÃO cria tarefas de SLA nem envia notificações/emails (backlog antigo,
 *    nunca contactar automaticamente);
 *  - deduplica por email OU telefone contra clientes/negócios existentes
 *    (e dentro do próprio lote);
 *  - suporta dryRun (só devolve o relatório, não escreve nada).
 * Protegido por LEAD_INTAKE_TOKEN (Bearer).
 */

const ItemSchema = z.object({
  name: z.string().max(150).optional(),
  email: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  createdLabel: z.string().max(60).optional(),
  metaStage: z.string().max(80).optional(),
  form: z.string().max(200).optional(),
  channel: z.string().max(60).optional(),
  metaSource: z.string().max(40).optional(),
});

const BodySchema = z.object({
  dryRun: z.boolean().default(true),
  leads: z.array(ItemSchema).max(500),
});

function digits(p?: string) {
  return (p || "").replace(/\D/g, "");
}
function phoneKey(p?: string) {
  const d = digits(p);
  return d.length >= 9 ? d.slice(-9) : d;
}

export async function POST(request: NextRequest) {
  const expected = process.env.META_IMPORT_TOKEN;
  if (!expected) return NextResponse.json({ error: "META_IMPORT_TOKEN em falta." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const { dryRun, leads } = parsed.data;

  const owner =
    (await prisma.user.findFirst({ where: { active: true, role: "ADMIN" }, orderBy: { createdAt: "asc" } })) ??
    (await prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } }));

  // Índices dos clientes existentes (email e telefone normalizado)
  const clients = await prisma.client.findMany({ select: { id: true, email: true, phone: true } });
  const byEmail = new Map<string, string>();
  const byPhone = new Map<string, string>();
  for (const c of clients) {
    if (c.email) byEmail.set(c.email.toLowerCase(), c.id);
    const k = phoneKey(c.phone || undefined);
    if (k) byPhone.set(k, c.id);
  }
  const clientsWithDeals = new Set(
    (await prisma.deal.findMany({ select: { clientId: true } })).map((d) => d.clientId)
  );

  const seenEmail = new Set<string>();
  const seenPhone = new Set<string>();
  const report = { total: leads.length, created: 0, skippedExistingDeal: 0, skippedDuplicateInBatch: 0, skippedNoContact: 0, linkedToExistingClient: 0, errors: 0 };
  const details: Array<{ name?: string; result: string }> = [];

  for (const l of leads) {
    const email = l.email?.toLowerCase().trim() || undefined;
    const pk = phoneKey(l.phone);
    const name = l.name?.trim() || "Lead Meta Ads (sem nome)";

    if (!email && !pk) {
      report.skippedNoContact++;
      details.push({ name, result: "sem_contacto" });
      continue;
    }
    if ((email && seenEmail.has(email)) || (pk && seenPhone.has(pk))) {
      report.skippedDuplicateInBatch++;
      details.push({ name, result: "duplicado_no_ficheiro" });
      continue;
    }
    if (email) seenEmail.add(email);
    if (pk) seenPhone.add(pk);

    const existingClientId = (email && byEmail.get(email)) || (pk && byPhone.get(pk)) || undefined;
    if (existingClientId && clientsWithDeals.has(existingClientId)) {
      report.skippedExistingDeal++;
      details.push({ name, result: "ja_existe_no_dsos" });
      continue;
    }

    if (dryRun) {
      report.created++;
      if (existingClientId) report.linkedToExistingClient++;
      details.push({ name, result: existingClientId ? "criaria_negocio_cliente_existente" : "criaria_cliente_e_negocio" });
      continue;
    }

    try {
      let clientId = existingClientId;
      if (!clientId) {
        const c = await prisma.client.create({
          data: { name, email, phone: l.phone?.trim() || undefined, type: "FAMILIA" },
        });
        clientId = c.id;
      } else {
        report.linkedToExistingClient++;
      }
      const notes = [
        "Importado do Centro de Leads da Meta (backlog, sem contacto automático).",
        l.createdLabel ? `Data na Meta: ${l.createdLabel}` : undefined,
        l.metaStage ? `Fase na Meta: ${l.metaStage}` : undefined,
        l.form ? `Formulário: ${l.form}` : undefined,
        l.channel ? `Canal: ${l.channel}` : undefined,
        l.metaSource ? `Fonte: ${l.metaSource}` : undefined,
      ].filter(Boolean).join("\n");

      const deal = await prisma.deal.create({
        data: {
          title: `Lead Meta Ads (importada) - ${name}`,
          clientId,
          source: LEAD_SOURCE.META_LEAD_ADS,
          ownerId: owner?.id,
          notes,
        },
      });
      clientsWithDeals.add(clientId);
      if (email) byEmail.set(email, clientId);
      if (pk) byPhone.set(pk, clientId);
      await prisma.activityLog.create({
        data: { userId: owner?.id, action: "CREATE", entity: "Deal", entityId: deal.id, meta: "source=meta-backlog-csv-import" },
      });
      report.created++;
      details.push({ name, result: "criado" });
    } catch (err) {
      report.errors++;
      details.push({ name, result: `erro: ${err instanceof Error ? err.message.slice(0, 120) : "desconhecido"}` });
    }
  }

  return NextResponse.json({ ok: true, dryRun, report, details });
}
