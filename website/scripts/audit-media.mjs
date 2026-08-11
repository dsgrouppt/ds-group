#!/usr/bin/env node
/**
 * Auditoria automática de fotografias/vídeos brutos de obras — NUNCA copia
 * nem move nada. Lê uma pasta de origem, classifica cada ficheiro por
 * heurística (nome de ficheiro/pasta + metadados reais) e escreve um
 * relatório JSON com a proposta de classificação, para revisão humana
 * antes de qualquer ficheiro entrar em `website/public/obras/`.
 *
 * Uso:
 *   node scripts/audit-media.mjs "/caminho/para/a/pasta/de/fotos"
 *
 * Requisitos:
 *   - `sharp` (já é dependência do website) para orientação/dimensões de imagem.
 *   - `ffprobe` (parte do ffmpeg) no PATH, opcional, para orientação de vídeo
 *     — se não estiver instalado, os vídeos ficam classificados só por
 *     nome de ficheiro/pasta, com um aviso no relatório.
 *
 * Classificação aplicada (ver tipo `MediaTag` em `src/types/index.ts`):
 *   antes | durante | depois | horizontal | vertical | drone | cozinha |
 *   casa-de-banho | pintura | pladur | pavimentos | fachada | exterior |
 *   interior | obra-completa
 *
 * Este script propõe — não decide. A palavra final sobre cada classificação
 * é sempre humana, antes de os ficheiros serem copiados para `public/obras/`.
 */

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".avi", ".m4v"]);

const KEYWORD_TAGS = [
  { tag: "antes", words: ["antes", "before", "pre-obra", "pre_obra"] },
  { tag: "durante", words: ["durante", "during", "obra-em-curso", "em-curso"] },
  { tag: "depois", words: ["depois", "after", "final", "concluido", "concluído"] },
  { tag: "drone", words: ["drone", "dji", "aerea", "aérea", "aereo", "aéreo"] },
  { tag: "cozinha", words: ["cozinha", "kitchen"] },
  { tag: "casa-de-banho", words: ["casa-de-banho", "wc", "banho", "bathroom", "casadebanho"] },
  { tag: "pintura", words: ["pintura", "paint"] },
  { tag: "pladur", words: ["pladur", "drywall", "gesso-cartonado", "pladour"] },
  { tag: "pavimentos", words: ["pavimento", "piso", "chao", "chão", "floor"] },
  { tag: "fachada", words: ["fachada", "facade", "exterior-fachada"] },
  { tag: "exterior", words: ["exterior", "jardim", "outdoor"] },
  { tag: "interior", words: ["interior", "indoor"] },
  { tag: "obra-completa", words: ["obra-completa", "geral", "overview", "capa", "cover"] },
];

function classifyByName(fullPathLower) {
  const tags = new Set();
  for (const { tag, words } of KEYWORD_TAGS) {
    if (words.some((w) => fullPathLower.includes(w))) tags.add(tag);
  }
  return Array.from(tags);
}

async function getImageOrientation(filePath) {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(filePath).metadata();
    if (!meta.width || !meta.height) return null;
    return meta.width >= meta.height ? "horizontal" : "vertical";
  } catch {
    return null;
  }
}

async function getVideoOrientation(filePath) {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=s=x:p=0",
      filePath,
    ]);
    const [w, h] = stdout.trim().split("x").map(Number);
    if (!w || !h) return null;
    return w >= h ? "horizontal" : "vertical";
  } catch {
    return null; // ffprobe indisponível ou falhou — fica sem orientação detetada
  }
}

async function walk(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, results);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext)) {
        results.push(full);
      }
    }
  }
  return results;
}

async function main() {
  const inputDir = process.argv[2];
  if (!inputDir) {
    console.error("Uso: node scripts/audit-media.mjs \"/caminho/para/a/pasta\"");
    process.exit(1);
  }
  if (!fs.existsSync(inputDir)) {
    console.error(`Pasta não encontrada: ${inputDir}`);
    process.exit(1);
  }

  console.log(`[audit-media] A percorrer ${inputDir} ...`);
  const files = await walk(inputDir);
  console.log(`[audit-media] ${files.length} ficheiros de imagem/vídeo encontrados. A classificar...`);

  let ffprobeWarned = false;
  const report = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const kind = IMAGE_EXT.has(ext) ? "foto" : "video";
    const lower = file.toLowerCase();
    const tags = classifyByName(lower);

    let orientation = null;
    if (kind === "foto") {
      orientation = await getImageOrientation(file);
    } else {
      orientation = await getVideoOrientation(file);
      if (orientation === null && !ffprobeWarned) {
        console.warn("[audit-media] Aviso: ffprobe não encontrado/falhou — vídeos sem orientação detetada automaticamente (só por nome de ficheiro).");
        ffprobeWarned = true;
      }
      if (orientation) tags.push(orientation);
    }
    if (kind === "foto" && orientation) tags.push(orientation);

    report.push({
      file: path.relative(inputDir, file),
      kind,
      proposedTags: Array.from(new Set(tags)),
      needsManualReview: tags.length === 0,
    });
  }

  const outPath = path.join(process.cwd(), "media-audit-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  const needsReview = report.filter((r) => r.needsManualReview).length;
  console.log(`[audit-media] Relatório escrito em ${outPath}`);
  console.log(`[audit-media] ${report.length} ficheiros classificados, ${needsReview} sem nenhuma tag automática (precisam de revisão manual do nome do ficheiro).`);
  console.log("[audit-media] Nada foi copiado ou movido — isto é só uma proposta de classificação.");
}

main();
