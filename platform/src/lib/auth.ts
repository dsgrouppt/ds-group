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

// ─────────────────────────────────────────────────────────────────────────
// DOIS PROVIDERS, UMA SESSÃO
// ─────────────────────────────────────────────────────────────────────────
// "credentials" (equipa, User+role) e "cliente" (Client, Portal do
// Cliente) emitem o MESMO tipo de sessão JWT, distinguido por
// `token.kind`. Isto é deliberado: mantém uma única stack de auth em vez
// de duplicar NextAuth, ao custo de partilharem o mesmo cookie de sessão
// — ou seja, um membro da equipa e um cliente não podem ter sessão
// simultânea no MESMO browser (teriam de usar janelas anónimas
// separadas). É uma limitação aceitável para o âmbito atual — documentada
// em docs/pendencias-tecnicas.md — e não compromete o isolamento de
// dados: `requireUser()` e `requireClient()` verificam sempre
// `token.kind` e rejeitam o outro tipo.
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  jwt: { maxAge: SESSION_MAX_AGE_SECONDS },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
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
          kind: "STAFF" as const,
        };
      },
    }),
    CredentialsProvider({
      id: "cliente",
      name: "Portal do Cliente",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Palavra-passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        if (!consume(`portal-login:${email}`)) {
          logger.warn("auth.portal_rate_limited", { email });
          throw new Error("Demasiadas tentativas. Aguarde alguns minutos antes de tentar novamente.");
        }

        const client = await prisma.client.findFirst({ where: { email } });

        // `portalActive` e `passwordHash` têm de estar ambos definidos —
        // um cliente sem acesso ativado (ver nota no schema) não consegue
        // autenticar mesmo que soubesse uma password antiga.
        if (!client || !client.portalActive || !client.passwordHash) {
          logger.warn("auth.portal_login_failed", {
            email,
            reason: !client ? "not_found" : !client.portalActive ? "inactive" : "no_password",
          });
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, client.passwordHash);
        if (!valid) {
          logger.warn("auth.portal_login_failed", { email, reason: "bad_password" });
          return null;
        }

        await prisma.client.update({ where: { id: client.id }, data: { lastLoginAt: new Date() } });
        logger.info("auth.portal_login_success", { clientId: client.id });

        return {
          id: client.id,
          name: client.name,
          email: client.email,
          kind: "CLIENTE" as const,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Login inicial — o objeto `user` só existe neste momento.
        const authUser = user as { id: string; kind: "STAFF" | "CLIENTE"; role?: RoleValue };
        token.kind = authUser.kind;
        token.id = authUser.id;
        token.checkedAt = Date.now();
        token.revoked = false;
        if (authUser.kind === "STAFF") {
          token.role = authUser.role;
        }
        return token;
      }

      const lastChecked = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      if (Date.now() - lastChecked > REVALIDATE_INTERVAL_MS && token.id) {
        if (token.kind === "CLIENTE") {
          const current = await prisma.client.findUnique({
            where: { id: token.id as string },
            select: { portalActive: true },
          });

          if (!current || !current.portalActive) {
            logger.warn("auth.portal_session_revoked", { clientId: token.id });
            token.revoked = true;
          } else {
            token.checkedAt = Date.now();
            token.revoked = false;
          }
        } else {
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
      }

      return token;
    },
    async session({ session, token }) {
      if (token.revoked) {
        session.user = { id: "", role: undefined, name: null, email: null };
        session.client = undefined;
        return session;
      }

      if (token.kind === "CLIENTE") {
        session.client = { id: token.id as string, name: token.name ?? null, email: token.email ?? null };
      } else if (session.user) {
        session.user.role = token.role as RoleValue;
        session.user.id = token.id as string;
      }

      return session;
    },
  },
};

/**
 * NOTA DE SEGURANÇA (ver docs/auditoria-plataforma.md):
 * A revalidação acima (utilizador desativado/perfil alterado, ou cliente
 * com portalActive=false) corre no callback `jwt`, que só é invocado por
 * `getServerSession` — ou seja, é aplicada em toda a renderização de
 * páginas e em todas as Server Actions (via `requireUser`/
 * `requireModuleAccess`/`requireClient`), com atraso máximo de 60s. NÃO é
 * aplicada pelo `middleware.ts` (que usa `getToken`, mais rápido mas sem
 * esta revalidação), porque o middleware corre em edge runtime e o Prisma
 * Client não corre nesse runtime. Na prática isto significa: o pior caso
 * é uma página a redirecionar para /login (ou /portal/login) no
 * carregamento seguinte, nunca a exposição de dados a uma conta já
 * desativada.
 */
