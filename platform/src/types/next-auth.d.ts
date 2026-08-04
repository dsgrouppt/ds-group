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
  }

  interface User {
    id: string;
    role: RoleValue;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: RoleValue;
    // Timestamp da última revalidação contra a base de dados, e sinalizador
    // de sessão revogada (utilizador desativado) — ver src/lib/auth.ts.
    checkedAt?: number;
    revoked?: boolean;
  }
}
