import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

// Nunca em /public — qualquer download passa por aqui, exige sessão válida.
// Isto é o que torna seguro guardar contratos e documentos de cliente em
// disco: sem sessão, o ficheiro não é acessível, mesmo sabendo a URL.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  // `session.user.id` vazio identifica uma sessão revogada (utilizador
  // desativado) — mesma verificação usada em requireUser() (src/lib/session.ts).
  // Um simples `!session?.user` NÃO chega aqui: o objeto `user` continua
  // truthy mesmo revogado (só o `id` fica vazio), o que deixaria esta rota
  // a servir ficheiros a uma conta já desativada.
  if (!session?.user?.id) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const attachment = await prisma.attachment.findUnique({ where: { id: params.id } });
  if (!attachment) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const buffer = await readStoredFile(attachment.path).catch(() => null);
  if (!buffer) {
    return new NextResponse("Ficheiro não encontrado no armazenamento", { status: 404 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.originalName)}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
