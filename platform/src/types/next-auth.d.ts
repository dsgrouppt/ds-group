import type { RoleValue } from "@/lib/enums";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: RoleValue | undefined;
    };
    // Presente apenas quando a sessão é de um cliente autenticado no
    // Portal do Cliente (ver src/lib/auth.ts, provider "cliente").
    client?: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }

  interface User {
    id: string;
    kind: "STAFF" | "CLIENTE";
    role?: RoleValue;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    kind: "STAFF" | "CLIENTE";
    role?: RoleValue;
    // Timestamp da última revalidação contra a base de dados, e sinalizador
    // de sessão revogada (utilizador desativado / cliente sem portal ativo)
    // — ver src/lib/auth.ts.
    checkedAt?: number;
    revoked?: boolean;
  }
}
