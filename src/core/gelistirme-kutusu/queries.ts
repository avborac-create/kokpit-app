import { prisma } from "@/core/db/prisma";

export async function gelistirmeTalepleriniListele() {
  return prisma.gelistirmeTalebi.findMany({
    include: { kullanici: true, durum: true },
    orderBy: { olusturmaTarihi: "asc" },
  });
}
