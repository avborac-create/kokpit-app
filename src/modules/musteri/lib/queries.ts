import { prisma } from "@/core/db/prisma";

export type MusteriFiltre = {
  arama?: string;
  durumKod?: string;
  sorumluAvukatId?: string;
};

export async function musterileriListele(filtre: MusteriFiltre = {}) {
  return prisma.musteri.findMany({
    where: {
      ...(filtre.arama
        ? { adSoyadUnvan: { contains: filtre.arama, mode: "insensitive" } }
        : {}),
      ...(filtre.durumKod ? { durum: { kod: filtre.durumKod } } : {}),
      ...(filtre.sorumluAvukatId ? { sorumluAvukatId: filtre.sorumluAvukatId } : {}),
    },
    include: {
      tip: true,
      durum: true,
      sorumluAvukat: true,
      _count: { select: { paraTrafigi: true } },
    },
    orderBy: { olusturmaTarihi: "desc" },
  });
}

export async function musteriGetir(id: string) {
  return prisma.musteri.findUnique({
    where: { id },
    include: {
      tip: true,
      durum: true,
      sorumluAvukat: true,
      paraTrafigi: {
        include: {
          tip: true,
          durum: true,
          kaynak: true,
          dosyalar: { include: { dosya: true } },
          tasnif: { include: { cariKod: true } },
          uyusmazlikGrubu: true,
        },
        orderBy: { tarih: "desc" },
      },
      irtibatKisileri: {
        orderBy: [{ birincilMi: "desc" }, { olusturmaTarihi: "asc" }],
      },
    },
  });
}

export async function paraTrafigiKaydiGetir(kayitId: string) {
  return prisma.musteriParaTrafigi.findUnique({
    where: { id: kayitId },
    include: {
      dosyalar: true,
      tasnif: true,
    },
  });
}

export async function avukatlariListele() {
  return prisma.kullanici.findMany({
    where: { aktifMi: true },
    orderBy: { adSoyad: "asc" },
  });
}
