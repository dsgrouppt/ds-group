import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

interface AttachmentItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const isImage = mimeType.startsWith("image/");
  return (
    <div className="w-10 h-10 rounded-md bg-mist flex items-center justify-center shrink-0" aria-hidden>
      <span className="text-xs font-medium text-graphite-light uppercase">{isImage ? "IMG" : mimeType.includes("pdf") ? "PDF" : "DOC"}</span>
    </div>
  );
}

/** Lista partilhada por Documentos / Fotos / Relatórios — só muda a `kind` filtrada a montante e o texto do estado vazio. */
export function AttachmentList({ items, emptyTitle, emptyDescription }: { items: AttachmentItem[]; emptyTitle: string; emptyDescription: string }) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="p-0">
        <ul className="divide-y divide-mist-2">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`/api/files/${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-6 py-4 hover:bg-paper/60 transition-colors"
              >
                <FileIcon mimeType={item.mimeType} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{item.originalName}</div>
                  <div className="text-xs text-graphite-light mt-0.5">
                    {formatDate(item.createdAt)} · {formatSize(item.size)}
                  </div>
                </div>
                <span className="text-xs font-medium text-graphite-light">Abrir →</span>
              </a>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
