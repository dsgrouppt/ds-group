import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { ROLE } from "../src/lib/enums";

const prisma = new PrismaClient();

// Etiquetas reais definidas em docs/crm-especificacao.md §5 — não são dados
// fictícios, são taxonomia da aplicação (o mesmo princípio de marca que
// proíbe estatísticas inventadas no website aplica-se aqui: não se semeiam
// clientes/negócios/obras de exemplo, só a estrutura de apoio).
const TAGS = [
  { name: "VIP", meaning: "Cliente investidor com potencial de projetos recorrentes" },
  { name: "Referência-Arquiteto", meaning: "Lead vindo de gabinete parceiro" },
  { name: "Risco-Prazo", meaning: "Projeto com atraso identificado — sinaliza atenção de direção" },
  { name: "Risco-Financeiro", meaning: "Pagamento em atraso" },
  { name: "Promotor", meaning: "Cliente que já deu testemunho ou referência" },
  { name: "Reincidente", meaning: "Segundo projeto ou mais com a DS" },
];

async function main() {
  for (const tag of TAGS) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: { meaning: tag.meaning },
      create: tag,
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@dsgroup.pt";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    console.log(`\nUtilizador admin já existe (${adminEmail}) — seed não gerou nova palavra-passe.\n`);
    return;
  }

  // Palavra-passe gerada aleatoriamente, nunca hardcoded — impressa uma
  // única vez na consola. Deve ser trocada no primeiro login.
  const generatedPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(generatedPassword, 12);

  await prisma.user.create({
    data: {
      name: "Diogo Sampaio",
      email: adminEmail,
      passwordHash,
      role: ROLE.ADMIN,
    },
  });

  console.log("\n============================================================");
  console.log(" Utilizador admin criado com sucesso.");
  console.log(` Email:        ${adminEmail}`);
  console.log(` Palavra-passe: ${generatedPassword}`);
  console.log(" Guarde esta password agora — não voltará a ser mostrada.");
  console.log(" Pode ser alterada em qualquer altura em O Meu Perfil, já dentro da plataforma.");
  console.log("============================================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
