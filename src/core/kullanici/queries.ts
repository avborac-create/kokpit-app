import { prisma } from "@/core/db/prisma";

export function kullanicilariListele() {
  return prisma.kullanici.findMany({
    select: {
      id: true,
      adSoyad: true,
      eposta: true,
      rol: true,
      buroRolu: true,
      aktifMi: true,
      olusturmaTarihi: true,
    },
    orderBy: { adSoyad: "asc" },
  });
}
