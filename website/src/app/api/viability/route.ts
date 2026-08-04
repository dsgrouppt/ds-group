import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { consume } from "@/lib/rate-limit";

export const runtime = "nodejs";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Recebe o Estudo de Viabilidade completo (multipart/form-data — inclui
 * eventuais anexos de plantas/fotografias). À semelhança de /api/contact,
 * os campos estruturados são reencaminhados para o HubSpot via Forms API.
 *
 * ANEXOS: este endpoint não persiste o conteúdo binário dos ficheiros —
 * requer um destino de armazenamento (Vercel Blob, S3, etc.) ainda não
 * configurado neste projeto (variável BLOB_READ_WRITE_TOKEN em falta).
 * Por agora, o pedido segue com a contagem/nomes dos ficheiros anexados
 * na mensagem, para o gestor de projeto os pedir de novo na primeira
 * chamada — sem bloquear a submissão do lead. Ver docs/pendencias-tecnicas.md.
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

  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formGuid = process.env.HUBSPOT_VIABILITY_FORM_GUID || process.env.HUBSPOT_FORM_GUID;

  if (!portalId || !formGuid) {
    console.error(
      "HUBSPOT_PORTAL_ID / HUBSPOT_VIABILITY_FORM_GUID não configurados — ver .env.local.example."
    );
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
    console.error("Erro de rede ao contactar o HubSpot (viability):", error);
    return NextResponse.json(
      { error: "Não foi possível enviar o pedido. Tente novamente." },
      { status: 502 }
    );
  }
}
