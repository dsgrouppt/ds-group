import { spawn } from "node:child_process";
import path from "node:path";
import { existsSync, createReadStream } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import os from "node:os";
import crypto from "node:crypto";
import { Readable } from "node:stream";
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
 * nao por um browser), que empacota STORAGE_DIR em .tar.gz e devolve.
 *
 * ATUALIZACAO (mesma auditoria, pouco depois): a primeira versao deste
 * endpoint devolvia a resposta em streaming direto do stdout do `tar`,
 * sem cabecalho Content-Length (o tamanho final so e conhecido no fim da
 * compressao) -- o Next.js usa entao Transfer-Encoding: chunked. Isso
 * partia o cliente do lado do servico "postgres": essa imagem
 * (postgres:18-bookworm) NAO TEM curl nem wget instalados (confirmado
 * via diagnostico direto no container), pelo que o fetch teve de ser
 * reescrito em bash puro usando /dev/tcp -- e um parser de chunked
 * encoding em bash e complexo e fragil o suficiente para ser, ele
 * proprio, um risco de bug silencioso num script de backup que corre
 * sem supervisao humana. Em vez disso, o tar agora e escrito primeiro
 * para um ficheiro temporario (dentro do proprio container, nunca
 * exposto), o seu tamanho exato e lido do disco, e so depois e enviado
 * com Content-Length explicito -- o script bash do lado do postgres faz
 * entao um unico `dd` binario do tamanho exato anunciado, sem qualquer
 * parsing de chunks. O ficheiro temporario e apagado no fim do pedido
 * (sucesso ou falha), nunca ficando residente em disco entre backups.
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

  const tmpFile = path.join(os.tmpdir(), `uploads-backup-${crypto.randomUUID()}.tar.gz`);

  try {
    await new Promise<void>((resolve, reject) => {
      const tar = spawn("tar", ["-czf", tmpFile, "-C", STORAGE_DIR, "."]);
      tar.on("error", reject);
      tar.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`tar terminou com código ${code}`));
      });
    });

    const { size } = await stat(tmpFile);
    const nodeStream = createReadStream(tmpFile);
    // Apaga o ficheiro temporário assim que o stream terminar (sucesso) ou
    // fechar a meio (cliente desligou-se) -- nunca deixa lixo em /tmp.
    nodeStream.on("close", () => {
      unlink(tmpFile).catch(() => {});
    });

    return new NextResponse(Readable.toWeb(nodeStream) as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="uploads-backup.tar.gz"`,
        "Content-Length": String(size),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    await unlink(tmpFile).catch(() => {});
    console.error("[uploads-backup] Falhou a criar o tarball:", err);
    return NextResponse.json({ error: "Falha ao gerar o backup de uploads." }, { status: 500 });
  }
}
