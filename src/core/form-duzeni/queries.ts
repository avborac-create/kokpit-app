import { prisma } from "@/core/db/prisma";

export async function formAlanDuzeniniGetir(formAnahtari: string) {
  return prisma.formAlanDuzeni.findMany({
    where: { formAnahtari },
    orderBy: { siraNo: "asc" },
  });
}
