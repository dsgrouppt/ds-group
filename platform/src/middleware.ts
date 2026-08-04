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

  if (isPortalRoute && pathname === "/portal/login") {
    return NextResponse.next();
  }

  const token = await getToken({ req });

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
