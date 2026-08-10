import { spawn } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), "storage", "uploads");

/**
 * Bug #24 (auditoria adversarial independente, ago/2026 — ALTO): o backup
 * diario (ver docs/backup-runbook.md) cobre apenas a base de dados
 * Postgres via `pg_dump`, correndo num servico Railway separado
 * ("postgres"). Os ficheiros anexados (contratos, fotos de obra,
 * documentos) vivem num volume persistente DIFERENTE, montado neste
 * servico ("ds-os-platform", em STORAGE_DIR), que nunca teve qualquer
 * cobertura de backup -- a funcionalidade nativa de backups da Railway
 * (separador "Backups") so esta disponivel no plano Pro, que esta conta
 * nao tem. Risco real: perda ou corrupcao deste volume (erro humano,
 * incidente Railway, bug de infraestrutura) apaga permanentemente todos
 * os contratos assinados e fotos de obra de todos os clientes, sem
 * qualquer via de recuperacao -- o dump da base de dados manteria os
 * registos `Attachment` na tabela, mas todos a apontar para ficheiros que
 * deixaram de existir. Para uma plataforma pensada para "centenas de
 * clientes", isto e uma lacuna critica de continuidade de negocio.
 *
 * Corrigido expondo este endpoint interno, protegido por um token
 * partilhado (nunca pela sessao de utilizador normal -- e chamado
 * maquina-a-maquina pelo servico de backup via rede privada da Railway,
 * nao por um browser), que empacota STORAGE_DIR em .tar.gz e devolve como
 * stream. O script de backup do servico "postgres" (ver
 * docs/backup-runbook.md) foi atualizado para descarregar este tarball
 * diariamente, com a mesma politica de retencao (7d/28d/365d) ja aplicada
 * aos dumps da base de dados.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.BACKUP_INTERNAL_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Backup interno não configurado (BACKUP_INTERNAL_TOKEN em falta)." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!existsSync(STORAGE_DIR)) {
    return NextResponse.json({ error: "Diretório de armazenamento não encontrado." }, { status: 500 });
  }

  const tar = spawn("tar", ["-czf", "-", "-C", STORAGE_DIR, "."]);

  const stream = new ReadableStream({
    start(controller) {
      tar.stdout.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      tar.stdout.on("end", () => controller.close());
      tar.on("error", (err) => controller.error(err));
      tar.stderr.on("data", () => {
        // tar emite avisos para stderr em cenários inofensivos (ex.: ficheiro
        // alterado durante a leitura); não tratamos como erro fatal — só o
        // código de saída do processo (via evento "error"/stdin fechado) importa.
      });
    },
    cancel() {
      tar.kill();
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="uploads-backup.tar.gz"`,
      "Cache-Control": "no-store",
    },
  });
}
