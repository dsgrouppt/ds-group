import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { can, type ModuleKey } from "@/lib/permissions";
import type { RoleValue } from "@/lib/enums";

interface AuthenticatedUser {
  id: string;
  role: RoleValue;
  name: string | null;
  email: string | null;
}

/** Uso em Server Components — obtém a sessão atual ou redireciona para o login. */
export async function requireUser(): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions);
  // `session.user.id` vazio identifica uma sessão revogada (utilizador
  // desativado ou apagado) — ver nota de segurança em src/lib/auth.ts.
  // Uma sessão válida (id não vazio) tem sempre `role` definido — são
  // escritos sempre em conjunto nos callbacks jwt/session de auth.ts.
  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }
  return session.user as AuthenticatedUser;
}

/** Uso em páginas de módulo — garante sessão + permissão de acesso ao módulo. */
export async function requireModuleAccess(moduleKey: ModuleKey) {
  const user = await requireUser();
  if (!can(user.role, moduleKey, "view")) {
    redirect("/acesso-negado");
  }
  return user;
}
