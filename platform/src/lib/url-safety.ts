/**
 * Sanitiza um "callbackUrl" vindo de query string (ex.: /login?callbackUrl=...)
 * antes de o usar num redirecionamento pos-login no cliente.
 *
 * Contexto: tanto o formulario de staff (LoginForm) como o do Portal do
 * Cliente (ClientLoginForm) fazem `router.push(callbackUrl)` depois de uma
 * autenticacao bem-sucedida. Se `callbackUrl` vier diretamente da query
 * string sem validacao, um atacante pode construir um link de phishing como
 * `/login?callbackUrl=https://site-falso.pt` -- a vitima autentica-se
 * legitimamente no dominio real, e so DEPOIS de autenticada e reencaminhada
 * para um site externo controlado pelo atacante (Unvalidated Redirect,
 * OWASP A01/A10). O `router.push` do App Router faz fallback para navegacao
 * completa do browser quando o valor nao e reconhecido como rota interna,
 * pelo que uma URL absoluta passa mesmo a redirecionar para fora do site.
 *
 * Esta funcao so aceita caminhos relativos internos que comecem por uma
 * unica barra (`/algo`), rejeitando:
 * - URLs absolutas (`https://...`, `http://...`)
 * - URLs protocol-relative (`//site-externo.pt`) -- o browser trata `//` no
 *   inicio como "mesmo protocolo, outro host"
 * - Esquemas alternativos (`javascript:`, `data:`, etc.) que nao passam no
 *   teste da barra unica de qualquer forma, mas sao explicitamente negados
 *   por seguranca em profundidade.
 */
export function safeInternalPath(raw: string | null | undefined, fallback: string): string {
    if (!raw) return fallback;

  // Tem de comecar por exatamente uma barra (caminho relativo a raiz) e nao
  // pode comecar por "//" ou "/\" (protocol-relative / trick de browser).
  if (!/^\/(?!\/|\\)/.test(raw)) return fallback;

  // Nunca deixar passar um esquema explicito escondido no meio do valor.
  if (/^\/[^?#]*:/i.test(raw)) return fallback;

  return raw;
}
