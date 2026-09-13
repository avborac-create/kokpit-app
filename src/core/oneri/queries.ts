import { prisma } from "@/core/db/prisma";

export async function onerileriListele() {
  return prisma.oneri.findMany({
    include: { kullanici: true },
    orderBy: { olusturmaTarihi: "desc" },
  });
}

export async function islenmemisOneriSayisi() {
  return prisma.oneri.count({ where: { islendiMi: false } });
}
