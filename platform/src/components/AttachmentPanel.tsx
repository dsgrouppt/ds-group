import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmButton";
import { SubmitButton } from "@/components/ui/SubmitButton";

export interface AttachmentItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  uploadedBy?: { name: string | null } | null;
}

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
}: {
  attachments: AttachmentItem[];
  uploadAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  canEdit: boolean;
  title?: string;
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
                <a
                  href={`/api/files/${att.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline truncate max-w-[60%]"
                >
                  {att.originalName}
                </a>
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
        <form action={uploadAction} encType="multipart/form-data" className="px-6 py-4 border-t border-mist-2 flex items-center gap-3 flex-wrap">
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
        </form>
      )}
    </Card>
  );
}
