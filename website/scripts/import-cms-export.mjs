#!/usr/bin/env node
/**
 * Importa um ficheiro exportado pelo DS OS (módulo "Site — Portefólio",
 * botão "Exportar conteúdo publicado" em /marketing/website) e escreve-o
 * como content/obras/<slug>/obra.json e content/testemunhos/<id>/testemunho.json
 * — os mesmos ficheiros e o mesmo formato que lib/portfolio.ts e
 * lib/testimonials-data.ts já sabem ler. Não faz nenhuma chamada de rede,
 * não apaga nada que não esteja no export, e nunca faz commit/push por si
 * só — isso continua a ser sempre uma decisão manual do autor da alteração.
 *
 * Uso:
 *   node scripts/import-cms-export.mjs ~/Transferências/ds-website-export-2026-08-11.json
 *
 * Depois de correr:
 *   1. Confirma com `git diff` o que mudou em content/.
 *   2. Se houver `cover-em-falta` nalguma obra, é sinal de que ainda não
 *      foi adicionada uma capa no DS OS — o site mostra um placeholder
 *      identificado nesse caso, nunca uma imagem inventada.
 *   3. Faz commit e push como qualquer outra alteração de conteúdo.
 */
import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Uso: node scripts/import-cms-export.mjs <caminho-do-export.json>");
  process.exit(1);
}

const raw = fs.readFileSync(path.resolve(inputPath), "utf-8");
const data = JSON.parse(raw);

const ROOT = process.cwd();
const OBRAS_DIR = path.join(ROOT, "content", "obras");
const TESTEMUNHOS_DIR = path.join(ROOT, "content", "testemunhos");

let obrasWritten = 0;
for (const caseStudy of data.caseStudies ?? []) {
  const dir = path.join(OBRAS_DIR, caseStudy.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "obra.json"), JSON.stringify(caseStudy, null, 2) + "\n");
  obrasWritten += 1;
  if (caseStudy.cover?.id === "cover-em-falta") {
    console.warn(`  [aviso] "${caseStudy.slug}" ainda não tem fotografia de capa definida no DS OS.`);
  }
}

let testemunhosWritten = 0;
for (const testimonial of data.testimonials ?? []) {
  const dir = path.join(TESTEMUNHOS_DIR, testimonial.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "testemunho.json"), JSON.stringify(testimonial, null, 2) + "\n");
  testemunhosWritten += 1;
}

console.log(`Importado: ${obrasWritten} obra(s), ${testemunhosWritten} testemunho(s).`);
console.log("Revê as alterações com `git diff content/` antes de fazeres commit.");
