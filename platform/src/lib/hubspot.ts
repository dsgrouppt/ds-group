/**
 * Sincronização DS OS → HubSpot (Prioridade 5 da execução de ago/2026:
 * "não existam dois CRMs independentes; DS OS deve ser a fonte
 * operacional principal; não duplicar clientes/leads").
 *
 * Direção deliberada e única: DS OS → HubSpot, nunca o inverso. O
 * HubSpot deixa de ser um segundo sistema independente onde leads podem
 * ficar presos sem a equipa comercial ver — passa a ser um espelho de
 * marketing, sempre atrás do DS OS. Isto respeita a decisão de negócio
 * já tomada em 2026-08-12 (ver docs/notificacoes-runbook.md) de mover
 * automações operacionais para fora do HubSpot (conta em tier Free, sem
 * Workflows) — este sync usa só a API de Contacts, disponível no tier
 * Free, nunca Workflows.
 *
 * Upsert por email via o endpoint oficial de batch upsert do HubSpot
 * (idProperty "email") — idempotente por definição: chamar duas vezes
 * com o mesmo email nunca cria um segundo contacto no HubSpot, mesmo que
 * esse contacto já lá exista de uma submissão direta do formulário do
 * site (website/src/app/api/contact/route.ts, que continua a submeter
 * diretamente à HubSpot Forms API — não foi tocado, é uma das áreas
 * "não mexer" desta missão). O HubSpot já faz dedup interno por email
 * nas duas vias (Forms API e Contacts API), por isso nunca há duplicação
 * de CONTACTOS no HubSpot — o que faltava era o resto dos dados (estado
 * do negócio, notas) alcançar lá, e é isso que este ficheiro resolve.
 *
 * Nunca lança exceção — mesmo padrão defensivo de src/lib/whatsapp.ts e
 * src/lib/email.ts: falha de rede ou API aqui nunca deve derrubar a
 * escrita já confirmada no DS OS (a base de dados própria é sempre a
 * fonte de verdade, mesmo que o espelho no HubSpot fique temporariamente
 * desatualizado).
 */

interface HubspotSyncInput {
  email: string;
  name: string;
  phone?: string | null;
  /** Etapa do negócio aberto mais recente, para contexto em marketing (ex.: "Proposta Enviada"). */
  latestDealStage?: string | null;
  dsOsClientId: string;
}

export interface HubspotSyncResult {
  ok: boolean;
  hubspotContactId?: string;
  error?: string;
}

const HUBSPOT_API_BASE = "https://api.hubapi.com";

/**
 * Upsert de um contacto no HubSpot por email. Nunca cria duplicados:
 * usa o endpoint de batch upsert oficial, que faz update se o email já
 * existir e create caso contrário — uma única chamada, sem race entre
 * "procurar" e "criar" (evita duas escritas concorrentes criarem dois
 * contactos para o mesmo email).
 */
export async function syncClientToHubspot(input: HubspotSyncInput): Promise<HubspotSyncResult> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    console.log(`[hubspot-sync] HUBSPOT_ACCESS_TOKEN não configurado — cliente ${input.dsOsClientId} não sincronizado (modo simulação).`);
    return { ok: false, error: "hubspot_nao_configurado" };
  }

  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "email_em_falta" };
  }

  const properties: Record<string, string> = {
    email,
    firstname: input.name,
    // Referência de volta ao DS OS — permite a um utilizador do HubSpot
    // encontrar o registo correspondente sem adivinhar (propriedade
    // custom, ver docs/hubspot-sync-setup.md para o passo de a criar na
    // conta HubSpot antes da primeira sincronização real).
    ds_os_client_id: input.dsOsClientId,
  };
  if (input.phone) properties.phone = input.phone;
  if (input.latestDealStage) properties.ds_os_deal_stage = input.latestDealStage;

  try {
    const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/batch/upsert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        inputs: [{ idProperty: "email", id: email, properties }],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[hubspot-sync] Falha ao sincronizar cliente ${input.dsOsClientId}:`, res.status, errText);
      return { ok: false, error: `hubspot_http_${res.status}` };
    }

    const json = (await res.json()) as { results?: Array<{ id?: string }> };
    const hubspotContactId = json.results?.[0]?.id;
    if (!hubspotContactId) {
      console.error(`[hubspot-sync] Resposta do HubSpot sem id de contacto para cliente ${input.dsOsClientId}:`, JSON.stringify(json));
      return { ok: false, error: "resposta_sem_id" };
    }

    return { ok: true, hubspotContactId };
  } catch (error) {
    console.error(`[hubspot-sync] Erro de rede a sincronizar cliente ${input.dsOsClientId}:`, error);
    return { ok: false, error: "erro_rede" };
  }
}
