import { prisma } from "@/core/db/prisma";

export async function menuDuzeniniGetir() {
  return prisma.menuOgesi.findMany({ orderBy: { siraNo: "asc" } });
}
