import { withAuth } from "next-auth/middleware";

// Protege todas as rotas exceto login, API de autenticação e ficheiros
// estáticos/internos do Next.js. Redireciona para a página de login
// personalizada (/login) em vez da página genérica do NextAuth.
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/((?!api/auth|api/health|login|_next/static|_next/image|favicon.ico).*)"],
};
