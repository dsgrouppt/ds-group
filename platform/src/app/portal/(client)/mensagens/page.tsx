import type { Metadata } from "next";
import { requireClient } from "@/lib/client-session";
import { prisma } from "@/lib/prisma";
import { getClientProjects, getProjectMessages } from "@/lib/portal-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { sendClientMessage } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mensagens" };

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default async function PortalMensagensPage({ searchParams }: { searchParams?: { projeto?: string } }) {
  const client = await requireClient();
  const projects = await getClientProjects(client.id);

  if (projects.length === 0) {
    return (
      <div>
        <PageHeader title="Mensagens" description="Converse diretamente com a sua equipa de projeto." />
        <Card>
          <EmptyState title="Sem projeto associado" description="A troca de mensagens fica disponível assim que a sua obra for criada." />
        </Card>
      </div>
    );
  }

  const activeProject = projects.find((p) => p.id === searchParams?.projeto) ?? projects[0];

  // Marca como lidas as mensagens da equipa para este projeto ao abrir a
  // conversa — efeito secundário deliberado num Server Component (leitura
  // de "recibo de leitura"), aceite aqui porque é idempotente e não tem
  // impacto visível fora deste separador (só zera o contador de não-lidas
  // no menu lateral).
  await prisma.clientMessage.updateMany({
    where: { projectId: activeProject.id, authorType: "EQUIPA", readByClient: false },
    data: { readByClient: true },
  });

  const messages = await getProjectMessages(activeProject.id);

  return (
    <div>
      <PageHeader title="Mensagens" description="Converse diretamente com a sua equipa de projeto." />

      {projects.length > 1 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {projects.map((p) => (
            <a
              key={p.id}
              href={`/portal/mensagens?projeto=${p.id}`}
              className={`text-xs font-medium rounded-full px-3.5 py-1.5 border transition-colors ${
                p.id === activeProject.id ? "bg-black text-white border-black" : "border-mist-2 text-graphite hover:border-graphite-light"
              }`}
            >
              {p.title}
            </a>
          ))}
        </div>
      )}

      <Card>
        <CardBody className="flex flex-col gap-5 max-h-[520px] overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState title="Ainda sem mensagens" description="Escreva a sua primeira mensagem à equipa de projeto abaixo." />
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex flex-col ${message.authorType === "CLIENTE" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-3 text-sm ${
                    message.authorType === "CLIENTE" ? "bg-black text-white" : "bg-paper border border-mist-2"
                  }`}
                >
                  {message.body}
                </div>
                <div className="text-[0.7rem] text-graphite-light mt-1.5">
                  {message.authorName} · {formatDateTime(message.createdAt)}
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <form action={sendClientMessage} className="mt-5 flex flex-col gap-3">
        <input type="hidden" name="projectId" value={activeProject.id} />
        <Textarea name="body" required maxLength={4000} rows={3} placeholder="Escreva a sua mensagem…" />
        <div className="flex justify-end">
          <SubmitButton pendingLabel="A enviar…">Enviar mensagem</SubmitButton>
        </div>
      </form>
    </div>
  );
}
