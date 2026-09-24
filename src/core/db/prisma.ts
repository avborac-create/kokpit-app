import { PrismaClient } from "@prisma/client";

// Next.js gelistirme modunda hot-reload sirasinda birden fazla PrismaClient
// olusmasini onlemek icin global'e cache'liyoruz.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
