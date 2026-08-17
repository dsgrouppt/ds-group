import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

// Duas áreas protegidas com sessões incompatíveis entre si (ver nota em
// src/lib/auth.ts): "/portal/*" exige um token de cliente
// (`kind === "CLIENTE"`), todo o resto exige um token de equipa
// (`kind === "STAFF"`). Um token do tipo errado é tratado exatamente como
// nenhum token — evita que uma sessão de cliente alcance rotas internas
// da equipa (ou o inverso) só porque `withAuth` por omissão apenas
// verifica "existe algum token".
export default async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const isPortalRoute = pathname.startsWith("/portal");
    const isFileDownload = pathname.startsWith("/api/files/");
    // /api/internal/* nunca é chamado por um browser com sessão — é invocado
    // máquina-a-máquina pelo serviço de backup via rede privada da Railway
    // (ver Bug #24, src/app/api/internal/uploads-backup/route.ts), autenticado
    // com um token partilhado (Authorization: Bearer), não com o cookie de
    // sessão do NextAuth. A verificação de autorização é feita na própria
    // rota, não aqui.
    if (pathname.startsWith("/api/internal/")) {
      return NextResponse.next();
    }

        // /api/webhooks/* recebe chamadas publicas da Meta (Lead Ads e
        // WhatsApp Business Cloud API) -- nunca tem cookie de sessao, nunca
        // pode ter (a Meta nao faz login no DS OS). A autenticacao e feita
        // dentro de cada rota por assinatura HMAC (X-Hub-Signature-256, ver
        // src/app/api/webhooks/meta-leads/route.ts e .../whatsapp/route.ts),
        // exatamente como /api/internal/* usa um Bearer token em vez do
        // cookie do NextAuth. Sem este bypass, o GET de verificacao da Meta
        // e todo POST de eventos caiam sempre em 307 -> /login.
        if (pathname.startsWith("/api/webhooks/")) {
                    return NextResponse.next();
        }

  if (isPortalRoute && pathname === "/portal/login") {
        return NextResponse.next();
  }

  const token = await getToken({ req });

  // Downloads de anexos (fotos, documentos, contratos) servem tanto
  // sessões de equipa como sessões de cliente (Portal do Cliente) — ver
  // src/app/api/files/[id]/route.ts, que já verifica, por ficheiro, se
  // um cliente pode aceder (visibleToClient + o anexo pertence-lhe). Bug
  // corrigido aqui: antes desta rota exigir sempre `token.kind ===
  // "STAFF"" tal como qualquer outra rota fora de "/portal", o que
  // bloqueava TODOS os downloads de clientes no Portal (redirecionava
  // para /login antes de a rota sequer correr a sua própria
  // autorização). Aqui só se exige alguma sessão válida e não revogada;
  // a autorização detalhada por ficheiro continua a ser feita na rota.
  if (isFileDownload) {
        if (!token || token.revoked) {
                return new NextResponse("Não autorizado", { status: 401 });
        }
        return NextResponse.next();
  }

  if (isPortalRoute) {
        if (!token || token.kind !== "CLIENTE" || token.revoked) {
                const url = new URL("/portal/login", req.url);
                url.searchParams.set("callbackUrl", pathname);
                return NextResponse.redirect(url);
        }
        return NextResponse.next();
  }

  if (!token || token.kind !== "STAFF" || token.revoked) {
        const url = new URL("/login", req.url);
        url.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api/auth|api/health|login|_next/static|_next/image|favicon.ico).*)"],
};
