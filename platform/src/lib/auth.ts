import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { consume } from "@/lib/rate-limit";
import type { RoleValue } from "@/lib/enums";

// Auditoria de segurança: sessão limitada a 8h (em vez dos 30 dias por
// omissão do NextAuth) — dados de clientes e financeiros justificam uma
// janela curta. O token é revalidado contra a base de dados (no máximo a
// cada 60s, não a cada pedido) — sem isto, desativar um utilizador ou
// mudar o seu perfil só fazia efeito quando o token expirasse (até 30
// dias por omissão do NextAuth).
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const REVALIDATE_INTERVAL_MS = 60_000;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  jwt: { maxAge: SESSION_MAX_AGE_SECONDS },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Palavra-passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // Proteção contra força bruta — ver limitação documentada em
        // src/lib/rate-limit.ts (por processo, não partilhada entre instâncias).
        if (!consume(`login:${email}`)) {
          logger.warn("auth.rate_limited", { email });
          throw new Error("Demasiadas tentativas. Aguarde alguns minutos antes de tentar novamente.");
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.active) {
          logger.warn("auth.login_failed", { email, reason: !user ? "not_found" : "inactive" });
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          logger.warn("auth.login_failed", { email, reason: "bad_password" });
          return null;
        }

        logger.info("auth.login_success", { userId: user.id });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as RoleValue,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Login inicial — o objeto `user` só existe neste momento.
        token.role = (user as { role: RoleValue }).role;
        token.id = user.id as string;
        token.checkedAt = Date.now();
        token.revoked = false;
        return token;
      }

      const lastChecked = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      if (Date.now() - lastChecked > REVALIDATE_INTERVAL_MS && token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { active: true, role: true },
        });

        if (!current || !current.active) {
          logger.warn("auth.session_revoked", { userId: token.id });
          token.revoked = true;
        } else {
          token.role = current.role as RoleValue;
          token.checkedAt = Date.now();
          token.revoked = false;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.revoked) {
        session.user = { id: "", role: undefined, name: null, email: null };
        return session;
      }
      if (session.user) {
        session.user.role = token.role as RoleValue;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

/**
 * NOTA DE SEGURANÇA (ver docs/auditoria-plataforma.md):
 * A revalidação acima (utilizador desativado/perfil alterado) corre no
 * callback `jwt`, que só é invocado por `getServerSession` — ou seja,
 * é aplicada em toda a renderização de páginas e em todas as Server
 * Actions (via `requireUser`/`requireModuleAccess`), com atraso máximo de
 * 60s. NÃO é aplicada pelo `middleware.ts` (que usa `getToken`, mais
 * rápido mas sem esta revalidação), porque o middleware corre em edge
 * runtime e o Prisma Client não corre nesse runtime. Na prática isto
 * significa: o pior caso é uma página a redirecionar para /login no
 * carregamento seguinte, nunca a exposição de dados a uma conta já
 * desativada.
 */
