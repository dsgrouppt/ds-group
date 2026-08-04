import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Assinaturas binárias ("magic bytes") dos tipos de ficheiro permitidos.
 * O cabeçalho `file.type` enviado pelo browser é apenas metadata do
 * pedido HTTP e pode ser falsificado trivialmente (ex.: um .exe renomeado
 * com Content-Type: application/pdf). Esta verificação lê os primeiros
 * bytes do conteúdo real e confirma que corresponde à assinatura
 * conhecida do tipo declarado — a mesma técnica usada por scanners de
 * upload de produção. Ficheiros DOCX/XLSX são ficheiros ZIP (assinatura
 * "PK\x03\x04"), por isso partilham assinatura com o próprio ZIP.
 */
type SignatureCheck = (buf: Buffer) => boolean;

const SIGNATURES: Record<string, SignatureCheck> = {
  "image/jpeg": (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a,
  "image/webp": (b) =>
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP",
  "image/heic": (b) => b.length >= 12 && b.toString("ascii", 4, 8) === "ftyp",
  "application/pdf": (b) => b.length >= 5 && b.toString("ascii", 0, 5) === "%PDF-",
  "application/msword": (b) =>
    b.length >= 8 &&
    b[0] === 0xd0 &&
    b[1] === 0xcf &&
    b[2] === 0x11 &&
    b[3] === 0xe0 &&
    b[4] === 0xa1 &&
    b[5] === 0xb1 &&
    b[6] === 0x1a &&
    b[7] === 0xe1,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (b) =>
    b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04,
  "application/vnd.ms-excel": (b) =>
    b.length >= 8 &&
    b[0] === 0xd0 &&
    b[1] === 0xcf &&
    b[2] === 0x11 &&
    b[3] === 0xe0 &&
    b[4] === 0xa1 &&
    b[5] === 0xb1 &&
    b[6] === 0x1a &&
    b[7] === 0xe1,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": (b) =>
    b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04,
};

export function matchesSignature(mimeType: string, buffer: Buffer): boolean {
  const check = SIGNATURES[mimeType];
  if (!check) return false;
  return check(buffer);
}

/**
 * Armazenamento de ficheiros — disco local por omissão (zero configuração,
 * zero conta externa). Cada ficheiro fica em STORAGE_DIR/<uuid>-<nome>.
 *
 * PRODUÇÃO: disco local só funciona em hosting com sistema de ficheiros
 * persistente (não funciona em serverless/Vercel, onde o filesystem é
 * efémero). Ver docs/producao.md — a troca para armazenamento object
 * storage (S3, R2, Supabase Storage) faz-se só nesta camada
 * (`saveFile`/`readStoredFile`/`deleteStoredFile`), sem tocar nas Server
 * Actions que a chamam.
 */

const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), "storage", "uploads");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

export function isAllowedFile(file: File): { ok: true } | { ok: false; reason: string } {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, reason: "Tipo de ficheiro não permitido. Use imagem, PDF, Word ou Excel." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, reason: "Ficheiro demasiado grande (máx. 25MB)." };
  }
  return { ok: true };
}

export async function saveFile(file: File): Promise<{
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  relativePath: string;
}> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (!matchesSignature(file.type, buffer)) {
    throw new Error(
      "O conteúdo do ficheiro não corresponde ao tipo declarado. Verifique se o ficheiro não está corrompido ou com extensão trocada."
    );
  }

  await mkdir(STORAGE_DIR, { recursive: true });

  const ext = path.extname(file.name) || "";
  const filename = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(STORAGE_DIR, filename);

  await writeFile(fullPath, buffer);

  return {
    filename,
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    relativePath: filename,
  };
}

export async function readStoredFile(relativePath: string): Promise<Buffer> {
  const fullPath = path.join(STORAGE_DIR, relativePath);
  return readFile(fullPath);
}

export async function deleteStoredFile(relativePath: string): Promise<void> {
  const fullPath = path.join(STORAGE_DIR, relativePath);
  await unlink(fullPath).catch(() => undefined);
}
