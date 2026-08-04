import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Badge } from "@/components/ui/Badge";

export interface AttachmentItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  kind?: string;
  visibleToClient?: boolean;
  uploadedBy?: { name: string | null } | null;
}

const KIND_LABEL: Record<string, string> = {
  DOCUMENTO: "Documento",
  FOTO_OBRA: "Foto de Obra",
  RELATORIO: "Relatório",
  OUTRO: "Outro",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPanel({
  attachments,
  uploadAction,
  deleteAction,
  canEdit,
  title = "Ficheiros",
  showPortalControls = false,
}: {
  attachments: AttachmentItem[];
  uploadAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  canEdit: boolean;
  title?: string;
  /** Mostra o seletor de tipo e o interruptor "visível para o cliente" —
   * só faz sentido quando o alvo do upload é um cliente ou uma obra
   * (nunca uma tarefa interna). */
  showPortalControls?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-[1.1rem]">
          {title} ({attachments.length})
        </h2>
      </CardHeader>
      <CardBody className="p-0">
        {attachments.length === 0 ? (
          <EmptyState title="Sem ficheiros" description="Fotografias, contratos, orçamentos e outros documentos ficam aqui." />
        ) : (
          <ul className="divide-y divide-mist-2">
            {attachments.map((att) => (
              <li key={att.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0 max-w-[60%]">
                  <a href={`/api/files/${att.id}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate block">
                    {att.originalName}
                  </a>
                  {showPortalControls && att.kind && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge>{KIND_LABEL[att.kind] ?? att.kind}</Badge>
                      {att.visibleToClient && <Badge tone="success">Visível ao cliente</Badge>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-graphite-light">{formatSize(att.size)}</span>
                  {canEdit && (
                    <form action={deleteAction}>
                      <input type="hidden" name="attachmentId" value={att.id} />
                      <ConfirmSubmitButton confirmMessage={`Apagar "${att.originalName}"?`}>Apagar</ConfirmSubmitButton>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
      {canEdit && (
        <form action={uploadAction} encType="multipart/form-data" className="px-6 py-4 border-t border-mist-2 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="file"
              name="file"
              required
              className="text-sm flex-1 min-w-[200px]"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <SubmitButton variant="secondary" className="shrink-0" pendingLabel="A enviar...">
              Enviar Ficheiro
            </SubmitButton>
          </div>
          {showPortalControls && (
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <label className="flex items-center gap-2">
                <span className="text-xs text-graphite-light">Tipo:</span>
                <select name="kind" defaultValue="DOCUMENTO" className="border border-mist-2 rounded-md px-2 py-1 text-xs bg-white">
                  {Object.entries(KIND_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-graphite-light">
                <input type="checkbox" name="visibleToClient" className="accent-gold" />
                Visível no Portal do Cliente
              </label>
            </div>
          )}
        </form>
      )}
    </Card>
  );
}
