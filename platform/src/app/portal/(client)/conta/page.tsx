import type { Metadata } from "next";
import { requireClient } from "@/lib/client-session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { FieldGroup, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { changeOwnClientPassword } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "A Minha Conta" };

export default async function PortalContaPage({ searchParams }: { searchParams?: { sucesso?: string } }) {
  const client = await requireClient();
  const sucesso = searchParams?.sucesso === "1";

  return (
    <div>
      <PageHeader title="A Minha Conta" description="Dados de acesso ao Portal do Cliente." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[900px]">
        <Card>
          <CardHeader>
            <h2 className="font-display text-[1.1rem]">Dados da Conta</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 text-sm">
            <div>
              <div className="text-xs text-graphite-light uppercase tracking-wide mb-1">Nome</div>
              <div>{client.name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-graphite-light uppercase tracking-wide mb-1">Email</div>
              <div>{client.email ?? "—"}</div>
            </div>
            <p className="text-xs text-graphite-light pt-2 border-t border-mist-2">
              Para alterar o nome ou o email associados à sua conta, contacte a sua equipa de projeto.
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
            <form action={changeOwnClientPassword} className="flex flex-col gap-4">
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
