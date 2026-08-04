import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TASK_STATUS, TASK_STATUS_LABEL, TASK_PRIORITY, TASK_PRIORITY_LABEL } from "@/lib/enums";
import { createTask } from "./actions";

export const dynamic = "force-dynamic";

const PRIORITY_TONE = {
  BAIXA: "neutral",
  NORMAL: "neutral",
  ALTA: "gold",
  URGENTE: "danger",
} as const;

export default async function TarefasPage() {
  const user = await requireModuleAccess("tarefas");
  const canEdit = can(user.role, "tarefas", "edit");

  // Duas queries separadas em vez de uma só filtrada em memória — com uma
  // única query ordenada por `status` e limitada a N linhas, tarefas
  // concluídas/canceladas antigas (que ordenam antes, alfabeticamente)
  // podiam encher o limite e fazer tarefas ativas desaparecerem da lista
  // assim que o total de tarefas da empresa ultrapassasse esse limite —
  // exatamente o cenário mais provável ao fim de alguns meses de uso real.
  const [pending, doneCount, done, users, deals, projects] = await Promise.all([
    prisma.task.findMany({
      where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
      orderBy: { dueAt: "asc" },
      include: { assignee: { select: { name: true } }, deal: { select: { title: true } }, project: { select: { title: true } } },
      take: 500,
    }),
    prisma.task.count({ where: { status: { in: ["CONCLUIDA", "CANCELADA"] } } }),
    prisma.task.findMany({
      where: { status: { in: ["CONCLUIDA", "CANCELADA"] } },
      orderBy: { updatedAt: "desc" },
      include: { assignee: { select: { name: true } }, deal: { select: { title: true } }, project: { select: { title: true } } },
      take: 100,
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true }, take: 500 }),
    prisma.deal.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true }, take: 500 }),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true }, take: 500 }),
  ]);

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description="Tarefas transversais a negócios e obras — com responsável, prioridade, estado, comentários e anexos."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-display text-[1.1rem]">Ativas ({pending.length})</h2>
            </CardHeader>
            <CardBody className="p-0">
              {pending.length === 0 ? (
                <EmptyState title="Sem tarefas ativas" description="Crie a primeira tarefa usando o formulário ao lado." />
              ) : (
                <Table>
                  <Thead>
                    <tr>
                      <Th>Tarefa</Th>
                      <Th>Responsável</Th>
                      <Th>Ligado a</Th>
                      <Th>Prazo</Th>
                      <Th>Prioridade</Th>
                      <Th>Estado</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {pending.map((task) => (
                      <Tr key={task.id}>
                        <Td className="font-medium">
                          <Link href={`/tarefas/${task.id}`} className="hover:underline">
                            {task.title}
                          </Link>
                        </Td>
                        <Td className="text-graphite-light">{task.assignee?.name ?? "—"}</Td>
                        <Td className="text-graphite-light">{task.deal?.title ?? task.project?.title ?? "—"}</Td>
                        <Td className="text-graphite-light">{task.dueAt ? new Date(task.dueAt).toLocaleDateString("pt-PT") : "—"}</Td>
                        <Td>
                          <Badge tone={PRIORITY_TONE[task.priority as keyof typeof PRIORITY_TONE]}>
                            {TASK_PRIORITY_LABEL[task.priority as keyof typeof TASK_PRIORITY_LABEL]}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge tone={task.status === "EM_CURSO" ? "gold" : "neutral"}>
                            {TASK_STATUS_LABEL[task.status as keyof typeof TASK_STATUS_LABEL]}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>

          {done.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-display text-[1.1rem]">
                  Concluídas / Canceladas ({doneCount}){doneCount > done.length ? ` — a mostrar as ${done.length} mais recentes` : ""}
                </h2>
              </CardHeader>
              <CardBody className="p-0">
                <ul className="divide-y divide-mist-2">
                  {done.map((task) => (
                    <li key={task.id} className="px-6 py-3 flex items-center justify-between gap-4">
                      <Link href={`/tarefas/${task.id}`} className="text-sm text-graphite-light hover:underline">
                        {task.title}
                      </Link>
                      <Badge>{TASK_STATUS_LABEL[task.status as keyof typeof TASK_STATUS_LABEL]}</Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>

        {canEdit && (
          <Card>
            <CardHeader>
              <h2 className="font-display text-[1.1rem]">Nova Tarefa</h2>
            </CardHeader>
            <CardBody>
              <form action={createTask} className="flex flex-col gap-4">
                <FieldGroup label="Título" htmlFor="title">
                  <Input id="title" name="title" required />
                </FieldGroup>
                <FieldGroup label="Descrição" htmlFor="description">
                  <Textarea id="description" name="description" rows={2} />
                </FieldGroup>
                <FieldGroup label="Responsável" htmlFor="assigneeId">
                  <Select id="assigneeId" name="assigneeId" defaultValue="">
                    <option value="">Sem responsável</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <FieldGroup label="Prioridade" htmlFor="priority">
                  <Select id="priority" name="priority" defaultValue={TASK_PRIORITY.NORMAL}>
                    {Object.entries(TASK_PRIORITY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <FieldGroup label="Estado" htmlFor="status">
                  <Select id="status" name="status" defaultValue={TASK_STATUS.PENDENTE}>
                    {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <FieldGroup label="Prazo" htmlFor="dueAt">
                  <Input id="dueAt" name="dueAt" type="date" />
                </FieldGroup>
                <FieldGroup label="Negócio associado" htmlFor="dealId">
                  <Select id="dealId" name="dealId" defaultValue="">
                    <option value="">Nenhum</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <FieldGroup label="Obra associada" htmlFor="projectId">
                  <Select id="projectId" name="projectId" defaultValue="">
                    <option value="">Nenhuma</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
                <SubmitButton>Criar Tarefa</SubmitButton>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
