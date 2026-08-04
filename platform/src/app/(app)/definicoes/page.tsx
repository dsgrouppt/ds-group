import Link from "next/link";
import { requireModuleAccess } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";

export default async function DefinicoesPage() {
  await requireModuleAccess("definicoes");

  return (
    <div>
      <PageHeader title="Definições" description="Configuração da plataforma DS OS." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-[720px]">
        <Link href="/definicoes/utilizadores">
          <Card className="hover:border-graphite-light transition-colors">
            <CardBody>
              <h2 className="font-display text-[1.15rem] mb-1.5">Utilizadores</h2>
              <p className="text-sm text-graphite-light">Contas, perfis e permissões da equipa.</p>
            </CardBody>
          </Card>
        </Link>
      </div>
    </div>
  );
}
