import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { consume } from "@/lib/rate-limit";

export const runtime = "nodejs";

interface ContactPayload {
  firstname: string;
  email: string;
  phone: string;
  project_type: string;
  budget_range: string;
  message?: string;
  consent: boolean;
  website?: string; // honeypot
  pageUri?: string;
  pageName?: string;
  // Atribuição de origem (UTM/gclid/fbclid) — ago/2026. Capturados no
  // primeiro touchpoint pelo browser (ver website/src/lib/analytics.ts,
  // captureAttribution) e só encaminhados ao DS OS (ver notifyDsOs abaixo)
  // — o HubSpot continua a receber exatamente o mesmo payload de sempre.
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  // event_id partilhado com o Pixel do browser para deduplicação no Meta
  // CAPI (ago/2026) — ver website/src/lib/analytics.ts (trackLeadConversion)
  // e platform/src/lib/meta-capi.ts.
  metaEventId?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Auditoria ponta-a-ponta (ago/2026): este formulário submetia SÓ ao
 * HubSpot — não existia nenhuma via automática para o DS OS, o que
 * significava que um lead do site nunca entrava sozinho no CRM. Isto
 * chama o DS OS diretamente (server-a-servidor, nunca o browser do
 * visitante) em paralelo com o HubSpot, autenticado por um token
 * partilhado (LEAD_INTAKE_TOKEN — ver platform/src/app/api/internal/
 * lead-intake/route.ts). Deliberadamente NÃO bloqueia nem altera a
 * resposta ao visitante: o resultado desta chamada só é registado nos
 * logs do servidor. O HubSpot continua a determinar a resposta ao
 * visitante, exatamente como antes — zero alteração de comportamento
 * visível se o DS OS estiver em baixo.
 */
async function notifyDsOs(body: ContactPayload): Promise<void> {
  const token = process.env.LEAD_INTAKE_TOKEN;
  if (!token) {
    console.error("[contact→DS OS] LEAD_INTAKE_TOKEN não configurado — lead não replicado no DS OS.");
    return;
  }
  const baseUrl = process.env.DS_OS_INTERNAL_URL || "https://os.dsprojects.pt";

  // Sinais observáveis apenas pelo servidor (nunca pelo browser do
  // visitante) para o evento Meta CAPI "Lead" (ago/2026, ver
  // platform/src/lib/meta-capi.ts): IP real do visitante (o DS OS, ao
  // receber este pedido servidor-a-servidor, só veria o IP da própria
  // Vercel — por isso tem de vir daqui), user-agent, e os cookies _fbp/
  // _fbc que o próprio Pixel da Meta define no browser do visitante.
  const clientIp =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() || headers().get("x-real-ip") || undefined;
  const userAgent = headers().get("user-agent") || undefined;
  const fbp = cookies().get("_fbp")?.value;
  const fbc = cookies().get("_fbc")?.value;

  try {
    const res = await fetch(`${baseUrl}/api/internal/lead-intake`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: body.firstname,
        email: body.email,
        phone: body.phone,
        projectType: body.project_type,
        budgetRange: body.budget_range,
        message: body.message,
        pageUri: body.pageUri,
        pageName: body.pageName,
        utmSource: body.utmSource,
        utmMedium: body.utmMedium,
        utmCampaign: body.utmCampaign,
        utmTerm: body.utmTerm,
        utmContent: body.utmContent,
        gclid: body.gclid,
        fbclid: body.fbclid,
        referrer: body.referrer,
        metaEventId: body.metaEventId,
        clientIp,
        userAgent,
        fbp,
        fbc,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[contact→DS OS] Falha ao criar lead no DS OS:", res.status, errText);
    }
  } catch (error) {
    console.error("[contact→DS OS] Erro de rede ao contactar o DS OS:", error);
  }
}

export async function POST(request: Request) {
  // Limite de 5 submissões por IP a cada 10 minutos — protege o HubSpot
  // (e o formulário) de submissões repetidas/automatizadas, sem exigir
  // login (este endpoint é público por natureza).
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || headers().get("x-real-ip") || "desconhecido";
  if (!consume(`contact:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Aguarde alguns minutos antes de tentar novamente." },
      { status: 429 }
    );
  }

  let body: ContactPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  // Honeypot: campo só visível/preenchível por bots. Devolve 200 "silencioso"
  // para não dar pistas a scripts automáticos, mas não contacta o HubSpot
  // nem o DS OS.
  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  if (!body.firstname || !body.email || !body.phone) {
    return NextResponse.json({ error: "Nome, email e telefone são obrigatórios." }, { status: 400 });
  }
  if (!isValidEmail(body.email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }
  if (!body.consent) {
    return NextResponse.json(
      { error: "É necessário aceitar a Política de Privacidade para submeter o pedido." },
      { status: 400 }
    );
  }

  // DS OS corre em paralelo com o HubSpot (Promise.allSettled) para não
  // duplicar a latência — o resultado do DS OS nunca decide a resposta.
  const dsOsPromise = notifyDsOs(body);

  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formGuid = process.env.HUBSPOT_FORM_GUID;

  if (!portalId || !formGuid) {
    console.error(
      "HUBSPOT_PORTAL_ID / HUBSPOT_FORM_GUID não configurados — ver .env.local.example."
    );
    await dsOsPromise;
    return NextResponse.json(
      { error: "Formulário temporariamente indisponível. Tente novamente mais tarde." },
      { status: 500 }
    );
  }

  // Cookie de tracking do próprio HubSpot (definido pelo tracking script hs-scripts.com,
  // se instalado no site). Quando presente, liga esta submissão ao histórico de
  // navegação do visitante dentro do HubSpot.
  const hutk = cookies().get("hubspotutk")?.value;

  const hubspotPayload = {
    fields: [
      { name: "firstname", value: body.firstname },
      { name: "email", value: body.email },
      { name: "phone", value: body.phone },
      { name: "project_type", value: body.project_type },
      { name: "budget_range", value: body.budget_range },
      { name: "message", value: body.message || "" },
    ],
    context: {
      hutk,
      pageUri: body.pageUri,
      pageName: body.pageName || "Website DS Projects",
    },
    // Se a conta HubSpot tiver as opções de conformidade RGPD ativadas,
    // substituir o bloco acima por algo como:
    // legalConsentOptions: {
    //   consent: {
    //     consentToProcess: true,
    //     text: "Autorizo o tratamento dos meus dados pela DS Projects.",
    //     communications: [
    //       { value: true, subscriptionTypeId: 999, text: "Autorizo comunicações de marketing." },
    //     ],
    //   },
    // },
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
      console.error("Erro na submissão HubSpot:", hsRes.status, errBody);
      return NextResponse.json(
        { error: "Não foi possível enviar o pedido. Tente novamente." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await dsOsPromise;
    console.error("Erro de rede ao contactar o HubSpot:", error);
    return NextResponse.json(
      { error: "Não foi possível enviar o pedido. Tente novamente." },
      { status: 502 }
    );
  }
}
