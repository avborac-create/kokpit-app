import { prisma } from "@/core/db/prisma";

// Haciz Raporu formundaki dosya secicisini doldurur - sadece Dosya Turu
// "İcra Dosyası" olan DavaDosyasi kayitlari (Esas/Talimat alt turu ile
// birlikte, secim listesinde ayirt edilebilsin diye).
export async function icraDosyalariniListele(arama?: string) {
  return prisma.davaDosyasi.findMany({
    where: {
      tur: { kod: "icra_dosyasi" },
      ...(arama
        ? {
            OR: [
              { konu: { contains: arama, mode: "insensitive" } },
              { dosyaNo: { contains: arama, mode: "insensitive" } },
              { muvekkiller: { some: { musteri: { adSoyadUnvan: { contains: arama, mode: "insensitive" } } } } },
            ],
          }
        : {}),
    },
    include: {
      icraAltTuru: true,
      muvekkiller: { include: { musteri: true } },
    },
    orderBy: { olusturmaTarihi: "desc" },
    take: 50,
  });
}

export async function hacizRaporlariniListele(filtre: { davaDosyasiId?: string } = {}) {
  return prisma.hacizRaporu.findMany({
    where: filtre.davaDosyasiId ? { davaDosyasiId: filtre.davaDosyasiId } : {},
    include: {
      davaDosyasi: { include: { muvekkiller: { include: { musteri: true } } } },
      avukat: true,
      tahsilatKanali: true,
    },
    orderBy: { hacizTarihi: "desc" },
  });
}

export async function hacizRaporuGetir(id: string) {
  return prisma.hacizRaporu.findUnique({
    where: { id },
    include: {
      davaDosyasi: { include: { muvekkiller: { include: { musteri: true } } } },
      avukat: true,
      tahsilatKanali: true,
      belgeler: { orderBy: { olusturmaTarihi: "asc" } },
    },
  });
}

export async function tahsilatKanallariniListele() {
  return prisma.secenekDegeri.findMany({
    where: { liste: { anahtar: "tahsilat_kanali" }, aktifMi: true },
    orderBy: { siraNo: "asc" },
  });
}
