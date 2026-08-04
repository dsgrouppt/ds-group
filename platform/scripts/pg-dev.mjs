#!/usr/bin/env node
/**
 * Postgres local para desenvolvimento, sem Docker e sem conta externa.
 * Usa `embedded-postgres` (mesma engine do Postgres real, binário
 * portátil, corre em espaço de utilizador). Só para desenvolvimento —
 * em produção usar um Postgres gerido (Neon, Supabase, RDS, etc.) através
 * de DATABASE_URL, conforme docs/producao.md.
 *
 * Uso:
 *   node scripts/pg-dev.mjs start   → inicia (ou reutiliza) o cluster local
 *   node scripts/pg-dev.mjs stop    → para o cluster local
 */
import EmbeddedPostgresModule from "embedded-postgres";
import { fileURLToPath } from "node:url";
import path from "node:path";

const EmbeddedPostgres = EmbeddedPostgresModule.default ?? EmbeddedPostgresModule;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, "..", ".pgdata");
const PORT = 5433;
const USER = "dsuser";
const PASSWORD = "dslocalpass";
const DB_NAME = "ds_os";

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

const cmd = process.argv[2] ?? "start";

async function ensureDatabase() {
  const client = pg.getPgClient();
  await client.connect();
  const { rows } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [DB_NAME]);
  if (rows.length === 0) {
    await client.query(`CREATE DATABASE ${DB_NAME}`);
    console.log(`Base de dados "${DB_NAME}" criada.`);
  }
  await client.end();
}

if (cmd === "start") {
  await pg.initialise();
  await pg.start();
  await ensureDatabase();
  const url = `postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DB_NAME}`;
  console.log("\nPostgres local pronto.");
  console.log(`DATABASE_URL="${url}"`);
  console.log("\n(mantenha este processo a correr; use noutro terminal `npm run db:push` etc.)\n");
  process.on("SIGINT", async () => {
    await pg.stop();
    process.exit(0);
  });
} else if (cmd === "stop") {
  await pg.stop();
  console.log("Postgres local parado.");
} else {
  console.error(`Comando desconhecido: ${cmd}`);
  process.exit(1);
}
