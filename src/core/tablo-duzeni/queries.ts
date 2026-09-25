import { prisma } from "@/core/db/prisma";

export async function tabloSutunDuzeniniGetir(tabloAnahtari: string) {
  return prisma.tabloSutunDuzeni.findMany({
    where: { tabloAnahtari },
    orderBy: { siraNo: "asc" },
  });
}
