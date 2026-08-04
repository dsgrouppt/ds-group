import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { FieldGroup, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ROLE_LABEL } from "@/lib/enums";
import { updateUser, resetPassword } from "../actions";

export const dynamic = "force-dynamic";

export default async function UtilizadorDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { novaPassword?: string };
}) {
  await requireModuleAccess("definicoes");

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) notFound();

  return (
    <div>
      <PageHeader title={user.name} description={user.email} />

      {searchParams.novaPassword && (
        <Card className="mb-6 border-gold">
          <CardBody>
            <p className="text-sm font-medium mb-1">Palavra-passe gerada — guarde-a agora:</p>
            <code className="text-sm bg-paper px-3 py-1.5 rounded-md inline-block">{searchParams.novaPassword}</code>
            <p className="text-xs text-graphite-light mt-2">Não será mostrada novamente depois de sair desta página.</p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[820px]">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Dados da Conta</h2>
          </CardHeader>
          <CardBody>
            <form action={updateUser} className="flex flex-col gap-4">
              <input type="hidden" name="userId" value={user.id} />
              <FieldGroup label="Nome" htmlFor="name">
                <Input id="name" name="name" defaultValue={user.name} required />
              </FieldGroup>
              <FieldGroup label="Perfil" htmlFor="role">
                <Select id="role" name="role" defaultValue={user.role}>
                  {Object.entries(ROLE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={user.active} />
                Conta ativa (pode entrar na plataforma)
              </label>
              <SubmitButton>Guardar Alterações</SubmitButton>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Segurança</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-graphite-light mb-4">
              Gera uma nova palavra-passe aleatória para esta conta. A anterior deixa de funcionar imediatamente.
            </p>
            <form action={resetPassword.bind(null, user.id)}>
              <SubmitButton variant="secondary" pendingLabel="A gerar...">
                Repor Palavra-passe
              </SubmitButton>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
