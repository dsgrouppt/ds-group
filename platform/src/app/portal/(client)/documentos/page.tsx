import type { Metadata } from "next";
import { requireClient } from "@/lib/client-session";
import { getClientAttachments } from "@/lib/portal-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { AttachmentList } from "@/components/portal/AttachmentList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documentos" };

export default async function PortalDocumentosPage() {
  const client = await requireClient();
  const items = await getClientAttachments(client.id, "DOCUMENTO");

  return (
    <div>
      <PageHeader title="Documentos" description="Contratos, plantas, memórias descritivas e outros ficheiros partilhados pela sua equipa de projeto." />
      <AttachmentList
        items={items}
        emptyTitle="Sem documentos partilhados"
        emptyDescription="Assim que a sua equipa de projeto partilhar um documento, vai aparecer aqui."
      />
    </div>
  );
}
