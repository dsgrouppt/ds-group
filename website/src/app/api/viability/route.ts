import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { consume } from "@/lib/rate-limit";

export const runtime = "nodejs";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Limites de anexos — mesmos valores usados no cliente (ver
 * ViabilityWizard.tsx) e deliberadamente bem abaixo do teto real da
 * Vercel (~4,5 MB por pedido). Esta é a segunda camada de defesa: um
 * pedido demasiado grande já é recusado pela própria Vercel com HTTP 413
 * antes de chegar aqui, mas esta validação cobre o caso de o pedido ainda
 * caber no limite da Vercel e mesmo assim exceder o que este formulário
 * suporta (ex.: cliente com JS desatualizado em cache, chamada direta à
 * API sem passar pelo wizard).
 */
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB por ficheiro
const MAX_TOTAL_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB no total
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".pdf", ".dwg"];
const ALLOWED_MIME_PREFIXES = ["image/"];
const ALLOWED_MIME_EXACT = ["application/pdf"];

function hasAllowedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isAllowedFileType(file: File): boolean {
  if (hasAllowedExtension(file.name)) return true;
  if (ALLOWED_MIME_EXACT.includes(file.type)) return true;
  if (ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix))) return true;
  return false;
}

/**
 * Mapa do vocabulário de "tipo de imóvel" do wizard (propertyType) para o
 * vocabulário esperado pelo endpoint interno do DS OS (projectType — ver
 * platform/src/app/api/internal/lead-intake/route.ts, ProjectTypeMap).
 * "apartamento" não existe nesse mapa (o DS OS usa "residencial") — sem
 * esta conversão o valor cairia no fallback genérico RESIDENCIAL de forma
 * silenciosa; aqui fica explícito e documentado.
 */
const PROPERTY_TYPE_TO_PROJECT_TYPE: Record<string, string> = {
  apartamento: "residencial",
  moradia: "moradia",
  comercial: "comercial",
  investimento: "investimento",
};

interface ViabilityFields {
  firstname: string;
  email: string;
  phone: string;
  propertyType: string;
  budgetRange: string;
  message: string;
  pageUri: string;
  pageName: string;
  metaEventId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
}

/**
 * Réplica automática do lead do wizard de Estudo de Viabilidade para o DS
 * OS (auditoria ago/2026 — o Execution AI detetou que, ao contrário de
 * /api/contact/route.ts, esta rota só submetia ao HubSpot, deixando os
 * leads deste formulário fora do CRM). Mesmo padrão exato do contact
 * route: chamada servidor-a-servidor, autenticada por LEAD_INTAKE_TOKEN,
 * corre em paralelo com o HubSpot, e o resultado NUNCA decide a resposta
 * ao visitante — zero alteração de comportamento visível se o DS OS
 * estiver em baixo.
 *
 * Os anexos não seguem nesta chamada (o DS OS lead-intake espera JSON, não
 * multipart, e ainda não existe armazenamento persistente configurado
 * neste projeto — ver comentário mais abaixo). O nome/contagem de
 * ficheiros vai incluído no campo `message`, para o gestor de projeto
 * saber que há ficheiros a pedir ao cliente.
 */
async function notifyDsOs(fields: ViabilityFields): Promise<void> {
  const token = process.env.LEAD_INTAKE_TOKEN;
  if (!token) {
    console.error("[viability→DS OS] LEAD_INTAKE_TOKEN não configurado — lead não replicado no DS OS.");
    return;
  }
  const baseUrl = process.env.DS_OS_INTERNAL_URL || "https://os.dsprojects.pt";

  const clientIp =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() || headers().get("x-real-ip") || undefined;
  const userAgent = headers().get("user-agent") || undefined;
  const fbp = cookies().get("_fbp")?.value;
  const fbc = cookies().get("_fbc")?.value;

  const projectType = PROPERTY_TYPE_TO_PROJECT_TYPE[fields.propertyType] || undefined;

  try {
    const res = await fetch(`${baseUrl}/api/internal/lead-intake`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: fields.firstname,
        email: fields.email,
        phone: fields.phone,
        projectType,
        budgetRange: fields.budgetRange,
        message: fields.message,
        pageUri: fields.pageUri,
        pageName: fields.pageName,
        utmSource: fields.utmSource,
        utmMedium: fields.utmMedium,
        utmCampaign: fields.utmCampaign,
        utmTerm: fields.utmTerm,
        utmContent: fields.utmContent,
        gclid: fields.gclid,
        fbclid: fields.fbclid,
        referrer: fields.referrer,
        metaEventId: fields.metaEventId,
        clientIp,
        userAgent,
        fbp,
        fbc,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[viability→DS OS] Falha ao criar lead no DS OS:", res.status, errText);
    }
  } catch (error) {
    console.error("[viability→DS OS] Erro de rede ao contactar o DS OS:", error);
  }
}

/**
 * Recebe o Estudo de Viabilidade completo (multipart/form-data — inclui
 * eventuais anexos de plantas/fotografias). À semelhança de /api/contact,
 * os campos estruturados são reencaminhados para o HubSpot via Forms API
 * E replicados para o DS OS (ver notifyDsOs acima).
 *
 * ANEXOS: este endpoint ainda não persiste o conteúdo binário dos
 * ficheiros — requer um destino de armazenamento (Vercel Blob, S3, etc.)
 * ainda não configurado neste projeto (variável BLOB_READ_WRITE_TOKEN em
 * falta). Por agora, o pedido segue com a contagem/nomes dos ficheiros
 * anexados na mensagem, para o gestor de projeto os pedir de novo na
 * primeira chamada — sem bloquear a submissão do lead. Ver
 * docs/documentos-internos.md e o item de backlog de armazenamento
 * persistente de anexos (Vercel Blob).
 */
export async function POST(request: Request) {
  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers().get("x-real-ip") ||
    "desconhecido";

  if (!consume(`viability:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Aguarde alguns minutos antes de tentar novamente." },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const get = (key: string) => String(form.get(key) || "");

  const firstname = get("firstname");
  const email = get("email");
  const phone = get("phone");
  const consent = get("consent") === "true";

  if (!firstname || !email || !phone) {
    return NextResponse.json({ error: "Nome, email e telefone são obrigatórios." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json(
      { error: "É necessário aceitar a Política de Privacidade para submeter o pedido." },
      { status: 400 }
    );
  }

  const attachments = form.getAll("attachments").filter((a): a is File => a instanceof File);

  // Defesa em profundidade (ver comentário nos limites acima): valida tipo
  // e tamanho de cada anexo, e o total combinado, mesmo que o cliente já
  // devesse ter impedido isto de acontecer.
  let totalSize = 0;
  for (const file of attachments) {
    if (!isAllowedFileType(file)) {
      return NextResponse.json(
        { error: `Formato de ficheiro não aceite: ${file.name}. Use PDF, JPG, PNG ou DWG.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `O ficheiro ${file.name} excede o limite de ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB.` },
        { status: 413 }
      );
    }
    totalSize += file.size;
  }
  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Os anexos ultrapassam o limite total de ${Math.round(MAX_TOTAL_SIZE_BYTES / (1024 * 1024))} MB.` },
      { status: 413 }
    );
  }

  const attachmentSummary =
    attachments.length > 0
      ? `${attachments.length} ficheiro(s) anexado(s): ${attachments.map((f) => f.name).join(", ")}`
      : "Nenhum ficheiro anexado.";

  const summaryLines = [
    `Tipo de imóvel: ${get("propertyType") || "—"}`,
    `Localização: ${get("location") || "—"}`,
    `Área: ${get("area") || "—"} m²`,
    `Prazo pretendido: ${get("timeline") || "—"}`,
    `Orçamento estimado: ${get("budgetRange") || "—"}`,
    `Objetivos: ${get("objectives") || "—"}`,
    `Contexto adicional: ${get("objectivesOther") || "—"}`,
    `Data preferencial de visita: ${get("preferredDate") || "A combinar"}`,
    `Período preferencial: ${get("preferredPeriod") || "—"}`,
    `Anexos: ${attachmentSummary}`,
    get("message") ? `Mensagem: ${get("message")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // DS OS corre em paralelo com o HubSpot (mesmo padrão de
  // /api/contact/route.ts) para não duplicar latência — o resultado do DS
  // OS nunca decide a resposta dada ao visitante.
  const dsOsPromise = notifyDsOs({
    firstname,
    email,
    phone,
    propertyType: get("propertyType"),
    budgetRange: get("budgetRange"),
    message: summaryLines,
    pageUri: get("pageUri"),
    pageName: get("pageName") || "Estudo de Viabilidade — Wizard",
    metaEventId: get("metaEventId") || undefined,
    utmSource: get("utmSource") || undefined,
    utmMedium: get("utmMedium") || undefined,
    utmCampaign: get("utmCampaign") || undefined,
    utmTerm: get("utmTerm") || undefined,
    utmContent: get("utmContent") || undefined,
    gclid: get("gclid") || undefined,
    fbclid: get("fbclid") || undefined,
    referrer: get("referrer") || undefined,
  });

  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formGuid = process.env.HUBSPOT_VIABILITY_FORM_GUID || process.env.HUBSPOT_FORM_GUID;

  if (!portalId || !formGuid) {
    console.error(
      "HUBSPOT_PORTAL_ID / HUBSPOT_VIABILITY_FORM_GUID não configurados — ver .env.local.example."
    );
    await dsOsPromise;
    return NextResponse.json(
      { error: "Formulário temporariamente indisponível. Tente novamente mais tarde ou ligue-nos diretamente." },
      { status: 500 }
    );
  }

  const hutk = cookies().get("hubspotutk")?.value;

  const hubspotPayload = {
    fields: [
      { name: "firstname", value: firstname },
      { name: "email", value: email },
      { name: "phone", value: phone },
      { name: "project_type", value: get("propertyType") },
      { name: "budget_range", value: get("budgetRange") },
      { name: "message", value: summaryLines },
    ],
    context: {
      hutk,
      pageUri: get("pageUri"),
      pageName: "Estudo de Viabilidade — Wizard",
    },
  };

  try {
    const hsRes = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hubspotPayload),
      }
    );

    await dsOsPromise;

    if (!hsRes.ok) {
      const errBody = await hsRes.text();
      console.error("Erro na submissão HubSpot (viability):", hsRes.status, errBody);
      return NextResponse.json(
        { error: "Não foi possível enviar o pedido. Tente novamente." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await dsOsPromise;
    console.error("Erro de rede ao contactar o HubSpot (viability):", error);
    return NextResponse.json(
      { error: "Não foi possível enviar o pedido. Tente novamente." },
      { status: 502 }
    );
  }
}
