import { PrismaClient } from "@prisma/client";

// Padrão singleton — evita esgotar ligações à base de dados em dev
// (hot-reload do Next.js recria módulos, mas não o processo).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
