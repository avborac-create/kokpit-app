import { PrismaClient } from "@prisma/client";
import { metinDuzeniUzantisi } from "./metin-duzeni";

// Yazma sırasında metin biçimini (baş harf büyük, bağlaçlar küçük vb.) düzelten
// uzantı burada bağlanır; bkz. metin-duzeni.ts.
function istemciOlustur() {
  return new PrismaClient().$extends(metinDuzeniUzantisi);
}

// Next.js gelistirme modunda hot-reload sirasinda birden fazla PrismaClient
// olusmasini onlemek icin global'e cache'liyoruz.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof istemciOlustur> | undefined;
};

export const prisma = globalForPrisma.prisma ?? istemciOlustur();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
