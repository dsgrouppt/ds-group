import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { FieldGroup, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ROLE_LABEL, type RoleValue } from "@/lib/enums";
import { changeOwnPassword } from "./actions";

export const dynamic = "force-dynamic";

export default async function PerfilPage({ searchParams }: { searchParams?: { sucesso?: string } }) {
  const user = await requireUser();
  const sucesso = searchParams?.sucesso === "1";

  return (
    <div>
      <PageHeader title="O Meu Perfil" description="Dados da sua conta e alteração da sua palavra-passe." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[900px]">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Dados da Conta</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 text-sm">
            <div>
              <div className="text-xs text-graphite-light uppercase tracking-wide mb-1">Nome</div>
              <div>{user.name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-graphite-light uppercase tracking-wide mb-1">Email</div>
              <div>{user.email ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-graphite-light uppercase tracking-wide mb-1">Perfil</div>
              <div>{ROLE_LABEL[user.role as RoleValue] ?? user.role}</div>
            </div>
            <p className="text-xs text-graphite-light pt-2 border-t border-mist-2">
              Para alterar o nome, email ou perfil, contacte um administrador em Definições &gt; Utilizadores.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Alterar Palavra-passe</h2>
          </CardHeader>
          <CardBody>
            {sucesso && (
              <div className="mb-4 rounded-md bg-success/10 text-success-text text-sm px-3.5 py-2.5">
                Palavra-passe alterada com sucesso.
              </div>
            )}
            <form action={changeOwnPassword} className="flex flex-col gap-4">
              <FieldGroup label="Palavra-passe atual" htmlFor="currentPassword">
                <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
              </FieldGroup>
              <FieldGroup label="Nova palavra-passe" htmlFor="newPassword">
                <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
              </FieldGroup>
              <FieldGroup label="Confirmar nova palavra-passe" htmlFor="confirmPassword">
                <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
              </FieldGroup>
              <SubmitButton>Alterar Palavra-passe</SubmitButton>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
