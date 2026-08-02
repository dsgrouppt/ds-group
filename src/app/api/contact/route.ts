import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  let body: ContactPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  // Honeypot: campo só visível/preenchível por bots. Devolve 200 "silencioso"
  // para não dar pistas a scripts automáticos, mas não contacta o HubSpot.
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

  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formGuid = process.env.HUBSPOT_FORM_GUID;

  if (!portalId || !formGuid) {
    console.error(
      "HUBSPOT_PORTAL_ID / HUBSPOT_FORM_GUID não configurados — ver .env.local.example."
    );
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
    console.error("Erro de rede ao contactar o HubSpot:", error);
    return NextResponse.json(
      { error: "Não foi possível enviar o pedido. Tente novamente." },
      { status: 502 }
    );
  }
}
