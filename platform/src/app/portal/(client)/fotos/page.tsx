import type { Metadata } from "next";
import { requireClient } from "@/lib/client-session";
import { getClientAttachments } from "@/lib/portal-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { AttachmentList } from "@/components/portal/AttachmentList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fotos da Obra" };

export default async function PortalFotosPage() {
  const client = await requireClient();
  const items = await getClientAttachments(client.id, "FOTO_OBRA");

  return (
    <div>
      <PageHeader title="Fotos da Obra" description="Registo fotográfico da evolução da sua obra, atualizado pela equipa em campo." />
      <AttachmentList
        items={items}
        emptyTitle="Sem fotografias ainda"
        emptyDescription="As fotografias de evolução da obra são publicadas periodicamente pela equipa de projeto."
      />
    </div>
  );
}
