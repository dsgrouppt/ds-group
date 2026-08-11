#!/usr/bin/env node
/**
 * Auditoria automática de fotografias/vídeos brutos de obras — NUNCA copia
 * nem move nada. Lê uma pasta de origem (espera-se `MEDIA/OBRAS/`, com uma
 * subpasta por obra, ver docs/playbook-fotografia.md), classifica cada
 * ficheiro por heurística (nome de ficheiro/pasta + metadados reais) e
 * agrega os resultados por obra, para uma única aprovação de lote em vez
 * de uma interrupção por obra (ver docs/protocolo-producao-obras.md).
 *
 * Uso:
 *   node scripts/audit-media.mjs "/caminho/para/MEDIA/OBRAS"
 *
 * Requisitos:
 *   - `sharp` (já é dependência do website) para orientação/dimensões/
 *     estimativa de qualidade de imagem.
 *   - `ffprobe` (parte do ffmpeg) no PATH, opcional, para orientação de
 *     vídeo — se não estiver instalado, os vídeos ficam classificados só
 *     por nome de ficheiro/pasta, com um aviso no relatório.
 *
 * Saída:
 *   - media-audit-report.json  → um registo por ficheiro (classificação bruta)
 *   - media-audit-obras.json   → um registo por obra (a tabela de auditoria
 *     global pedida no protocolo — nome provisório, categoria, localização,
 *     contagens, qualidade estimada, duplicados, capa/vídeo sugeridos,
 *     estado de preparação)
 *
 * Este script propõe — nunca decide. Todos os campos calculados aqui são
 * heurísticas explícitas e documentadas (ver comentários junto de cada
 * cálculo), nunca uma "opinião" opaca — a palavra final é sempre humana,
 * antes de qualquer ficheiro ser copiado para `public/obras/` ou qualquer
 * obra ser publicada.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".avi", ".m4v"]);

// Mesma lista de docs/checklist-lancamento-v1.md / website/src/lib/site-data.ts
// (siteConfig.locations) — duplicada aqui de propósito porque este script
// corre fora do TypeScript/bundler do website (Node puro, sem alias @/).
// Manter em sincronia se a lista de zonas de atuação mudar.
const KNOWN_LOCATIONS = [
  "lisboa", "porto", "cascais", "oeiras", "sintra",
  "vila nova de gaia", "vila-nova-de-gaia", "matosinhos", "almada",
];

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

// Categoria de negócio (a mesma taxonomia de website/src/types CaseStudy.category)
// inferida a partir das tags de divisão/assunto detetadas nos ficheiros.
// É sempre uma ESTIMATIVA a confirmar — o script nunca sabe, por exemplo,
// se uma obra é "premium" só a olhar para fotos, isso é sempre decisão humana.
const CATEGORY_FROM_TAG = {
  cozinha: "cozinhas",
  "casa-de-banho": "casas-de-banho",
  fachada: "moradias",
  exterior: "moradias",
};

function classifyByName(fullPathLower) {
  const tags = new Set();
  for (const { tag, words } of KEYWORD_TAGS) {
    if (words.some((w) => fullPathLower.includes(w))) tags.add(tag);
  }
  return Array.from(tags);
}

function guessLocation(obraFolderName) {
  const lower = obraFolderName.toLowerCase();
  const found = KNOWN_LOCATIONS.find((loc) => lower.includes(loc.replace(/-/g, " ")) || lower.includes(loc));
  if (!found) return null;
  // Capitaliza cada palavra (ex.: "vila nova de gaia" -> "Vila Nova de Gaia")
  return found
    .replace(/-/g, " ")
    .split(" ")
    .map((w) => (w.length <= 2 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

function humanizeName(folderName) {
  return folderName
    .replace(/^_+/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getImageMeta(filePath) {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(filePath).metadata();
    if (!meta.width || !meta.height) return { orientation: null, megapixels: null };
    return {
      orientation: meta.width >= meta.height ? "horizontal" : "vertical",
      megapixels: Math.round(((meta.width * meta.height) / 1_000_000) * 10) / 10,
    };
  } catch {
    return { orientation: null, megapixels: null };
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

/** Hash SHA-256 em streaming — usado só para detetar duplicados EXATOS (byte a
 * byte). Não tenta detetar "quase-duplicados" (ex.: duas fotos de rajada
 * muito parecidas mas não idênticas) — isso exigiria hashing percetual, que
 * este script deliberadamente não faz, para nunca reportar uma suspeita de
 * duplicado que na prática não o é. */
function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function walkFiles(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(full, results);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext)) results.push(full);
    }
  }
  return results;
}

/**
 * Estado de preparação (%) — soma de pesos explícitos, não uma pontuação de
 * "IA a decidir". Cada critério vale o que está indicado; o total é sempre
 * 100 quando todos os critérios são cumpridos.
 */
const READINESS_WEIGHTS = {
  temLocalizacao: 10,
  temCategoria: 10,
  temFotosDepoisSuficientes: 25, // >=2 fotos "depois" (mínimo absoluto — ver playbook-fotografia.md para mínimos por tipo de obra)
  temCapaSugerida: 15,
  temParAntesDepois: 15,
  semMaterialInsuficiente: 15,
  temPeloMenosUmVideo: 10,
};

function estimateQuality(photoMegapixels) {
  const valid = photoMegapixels.filter((m) => m !== null);
  if (valid.length === 0) return "Não avaliável (sem metadados de imagem legíveis)";
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  if (avg >= 10) return "Alta (média " + avg.toFixed(1) + " MP)";
  if (avg >= 4) return "Média (média " + avg.toFixed(1) + " MP)";
  return "Baixa (média " + avg.toFixed(1) + " MP) — confirmar se a fonte é a original, não uma miniatura";
}

async function auditObra(obraDir, obraFolderName) {
  const files = await walkFiles(obraDir);
  const fileRecords = [];
  const hashGroups = new Map();

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const kind = IMAGE_EXT.has(ext) ? "foto" : "video";
    const lower = file.toLowerCase();
    const tags = classifyByName(lower);

    let orientation = null;
    let megapixels = null;
    if (kind === "foto") {
      const meta = await getImageMeta(file);
      orientation = meta.orientation;
      megapixels = meta.megapixels;
    } else {
      orientation = await getVideoOrientation(file);
    }
    if (orientation) tags.push(orientation);

    const hash = await hashFile(file);
    if (!hashGroups.has(hash)) hashGroups.set(hash, []);
    hashGroups.get(hash).push(path.relative(obraDir, file));

    fileRecords.push({
      file: path.relative(obraDir, file),
      kind,
      tags: Array.from(new Set(tags)),
      orientation,
      megapixels,
      hash,
    });
  }

  const duplicateGroups = Array.from(hashGroups.values()).filter((group) => group.length > 1);

  const photos = fileRecords.filter((f) => f.kind === "foto");
  const videos = fileRecords.filter((f) => f.kind === "video");
  const countTag = (tag) => fileRecords.filter((f) => f.tags.includes(tag)).length;

  const fotosAntes = photos.filter((f) => f.tags.includes("antes")).length;
  const fotosDurante = photos.filter((f) => f.tags.includes("durante")).length;
  const fotosDepois = photos.filter((f) => f.tags.includes("depois")).length;

  // Categoria: tag de divisão mais frequente entre as reconhecidas em
  // CATEGORY_FROM_TAG; sem nenhuma tag reconhecida, fica "indefinida".
  const tagCounts = {};
  for (const f of fileRecords) for (const t of f.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
  const categoryTag = Object.keys(CATEGORY_FROM_TAG)
    .sort((a, b) => (tagCounts[b] || 0) - (tagCounts[a] || 0))
    .find((t) => tagCounts[t] > 0);
  const categoria = categoryTag ? CATEGORY_FROM_TAG[categoryTag] : "residencial"; // omissão razoável, sempre "a confirmar"

  const localizacao = guessLocation(obraFolderName);

  // Capa sugerida: prioriza "depois" + maior resolução + horizontal;
  // caem em cascata critérios menos exigentes se não houver candidato ideal.
  const coverCandidates = photos.filter((f) => f.tags.includes("depois"));
  const pickBestPhoto = (list) =>
    [...list].sort((a, b) => {
      const aHoriz = a.orientation === "horizontal" ? 1 : 0;
      const bHoriz = b.orientation === "horizontal" ? 1 : 0;
      if (aHoriz !== bHoriz) return bHoriz - aHoriz;
      return (b.megapixels ?? 0) - (a.megapixels ?? 0);
    })[0] ?? null;
  const capaSugerida = pickBestPhoto(coverCandidates) ?? pickBestPhoto(photos);

  const videoCandidates = videos.filter((f) => f.tags.includes("depois") || f.tags.includes("obra-completa"));
  const videoSugerido =
    (videoCandidates.find((f) => f.orientation === "horizontal") ?? videoCandidates[0]) ??
    videos.find((f) => f.orientation === "horizontal") ??
    videos[0] ??
    null;

  const temParAntesDepois = fotosAntes > 0 && fotosDepois > 0;
  const materialInsuficiente = fotosDepois < 2; // mínimo absoluto de segurança — ver playbook-fotografia.md por tipo de obra

  const readinessChecks = {
    temLocalizacao: Boolean(localizacao),
    temCategoria: Boolean(categoryTag),
    temFotosDepoisSuficientes: fotosDepois >= 2,
    temCapaSugerida: Boolean(capaSugerida),
    temParAntesDepois,
    semMaterialInsuficiente: !materialInsuficiente,
    temPeloMenosUmVideo: videos.length > 0,
  };
  const estadoPreparacao = Object.entries(readinessChecks).reduce(
    (sum, [key, passed]) => sum + (passed ? READINESS_WEIGHTS[key] : 0),
    0
  );

  return {
    obra: obraFolderName,
    nomeProvisorio: humanizeName(obraFolderName),
    categoria,
    categoriaConfirmada: false,
    localizacao,
    nFotografias: photos.length,
    nVideos: videos.length,
    fotosAntes,
    fotosDurante,
    fotosDepois,
    drone: countTag("drone"),
    verticais: fileRecords.filter((f) => f.orientation === "vertical").length,
    horizontais: fileRecords.filter((f) => f.orientation === "horizontal").length,
    qualidadeEstimada: estimateQuality(photos.map((f) => f.megapixels)),
    duplicadosPossiveis: duplicateGroups,
    materialInsuficiente,
    motivoMaterialInsuficiente: materialInsuficiente
      ? `Só ${fotosDepois} fotografia(s) de "depois" (mínimo recomendado: 2, idealmente mais — ver playbook-fotografia.md por tipo de obra)`
      : null,
    capaSugerida: capaSugerida ? capaSugerida.file : null,
    videoSugerido: videoSugerido ? videoSugerido.file : null,
    estadoPreparacaoPercent: estadoPreparacao,
    ficheiros: fileRecords,
  };
}

async function main() {
  const inputDir = process.argv[2];
  if (!inputDir) {
    console.error('Uso: node scripts/audit-media.mjs "/caminho/para/MEDIA/OBRAS"');
    process.exit(1);
  }
  if (!fs.existsSync(inputDir)) {
    console.error(`Pasta não encontrada: ${inputDir}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(inputDir, { withFileTypes: true });
  const obraFolders = entries.filter((e) => e.isDirectory() && !e.name.startsWith("_"));

  if (obraFolders.length === 0) {
    console.error(
      `[audit-media] Nenhuma subpasta de obra encontrada em ${inputDir} (pastas que começam por "_" são sempre ignoradas). ` +
        `Este script espera uma pasta por obra, ex.: MEDIA/OBRAS/<obra>/ — ver docs/playbook-fotografia.md.`
    );
    process.exit(1);
  }

  console.log(`[audit-media] ${obraFolders.length} pasta(s) de obra encontrada(s). A auditar...`);

  const obras = [];
  const flatFileReport = [];
  let ffprobeMissing = false;

  for (const entry of obraFolders) {
    const obraDir = path.join(inputDir, entry.name);
    const result = await auditObra(obraDir, entry.name);
    obras.push(result);
    for (const f of result.ficheiros) {
      flatFileReport.push({ obra: entry.name, ...f });
      if (f.kind === "video" && f.orientation === null) ffprobeMissing = true;
    }
  }

  fs.writeFileSync(
    path.join(process.cwd(), "media-audit-report.json"),
    JSON.stringify(flatFileReport, null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(process.cwd(), "media-audit-obras.json"),
    JSON.stringify(obras.map(({ ficheiros, ...summary }) => summary), null, 2),
    "utf-8"
  );
  // Guarda também os ficheiros detalhados por obra num ficheiro à parte
  // (o resumo acima é a "tabela" — isto é o detalhe de apoio, se precisares
  // de justificar uma linha da tabela).
  fs.writeFileSync(
    path.join(process.cwd(), "media-audit-obras-detalhe.json"),
    JSON.stringify(obras, null, 2),
    "utf-8"
  );

  console.log(`[audit-media] Relatórios escritos: media-audit-report.json, media-audit-obras.json, media-audit-obras-detalhe.json`);
  console.log(`[audit-media] ${obras.length} obra(s) auditada(s), ${flatFileReport.length} ficheiro(s) no total.`);
  if (ffprobeMissing) {
    console.warn("[audit-media] Aviso: ffprobe não encontrado/falhou para pelo menos um vídeo — orientação de vídeo nesses casos ficou por detetar automaticamente.");
  }
  console.log("[audit-media] Nada foi copiado ou movido — isto é só uma proposta de classificação e auditoria, para aprovação em lote.");
}

main();
