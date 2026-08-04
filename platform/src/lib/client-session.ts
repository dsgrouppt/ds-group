import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

interface AuthenticatedClient {
  id: string;
  name: string | null;
  email: string | null;
}

/**
 * Equivalente a `requireUser()` (src/lib/session.ts), mas para o Portal
 * do Cliente. Deliberadamente não partilha código com `requireUser` —
 * são domínios de autorização diferentes (Client vs. User+role) e
 * misturá-los é como se introduz um bug em que uma sessão de equipa
 * ganha acesso a rotas do portal ou vice-versa.
 */
export async function requireClient(): Promise<AuthenticatedClient> {
  const session = await getServerSession(authOptions);

  if (!session?.client?.id) {
    redirect("/portal/login");
  }

  return session.client;
}
