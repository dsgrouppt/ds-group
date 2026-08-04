import type { Metadata } from "next";
import { requireClient } from "@/lib/client-session";
import { getClientAttachments } from "@/lib/portal-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { AttachmentList } from "@/components/portal/AttachmentList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Relatórios" };

export default async function PortalRelatoriosPage() {
  const client = await requireClient();
  const items = await getClientAttachments(client.id, "RELATORIO");

  return (
    <div>
      <PageHeader title="Relatórios" description="Relatórios de progresso e vistoria emitidos pela equipa de gestão de obra." />
      <AttachmentList
        items={items}
        emptyTitle="Sem relatórios publicados"
        emptyDescription="Os relatórios de progresso são publicados nos marcos-chave da obra."
      />
    </div>
  );
}
