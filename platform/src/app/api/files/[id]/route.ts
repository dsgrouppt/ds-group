import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

// Nunca em /public — qualquer download passa por aqui, exige sessão válida.
// Isto é o que torna seguro guardar contratos e documentos de cliente em
// disco: sem sessão, o ficheiro não é acessível, mesmo sabendo a URL.
//
// Serve dois tipos de sessão (ver src/lib/auth.ts):
//  - Equipa (session.user): acesso total, sem restrição de visibilidade —
//    igual ao comportamento original desta rota.
//  - Cliente (session.client, Portal do Cliente): só pode descarregar um
//    anexo se `visibleToClient` for verdadeiro E o anexo pertencer a esse
//    cliente (diretamente ou através de um dos seus projetos). Esta
//    verificação está aqui, não só na UI do portal — um cliente autenticado
//    não pode ver o anexo de outro cliente só por adivinhar o `id`.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  const attachment = await prisma.attachment.findUnique({ where: { id: params.id } });
  if (!attachment) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  // `session.user.id` vazio identifica uma sessão de equipa revogada
  // (utilizador desativado) — mesma verificação usada em requireUser()
  // (src/lib/session.ts). Um simples `!session?.user` NÃO chega aqui: o
  // objeto `user` continua truthy mesmo revogado (só o `id` fica vazio).
  const isStaff = !!session?.user?.id;

  let isAuthorizedClient = false;
  if (!isStaff && session?.client?.id) {
    if (attachment.visibleToClient) {
      if (attachment.clientId === session.client.id) {
        isAuthorizedClient = true;
      } else if (attachment.projectId) {
        const project = await prisma.project.findFirst({
          where: { id: attachment.projectId, clientId: session.client.id },
          select: { id: true },
        });
        isAuthorizedClient = !!project;
      }
    }
  }

  if (!isStaff && !isAuthorizedClient) {
    return new NextResponse("Não autorizado", { status: 401 });
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
