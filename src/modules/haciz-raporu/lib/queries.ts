import { varyantlarla } from "@/core/arama";
import { prisma } from "@/core/db/prisma";

// Haciz Raporu formundaki dosya secicisini doldurur - sadece Dosya Turu
// "İcra Dosyası" olan ve muvekkilin ALACAKLI oldugu DavaDosyasi kayitlari
// (Esas/Talimat alt turu ile birlikte, secim listesinde ayirt edilebilsin diye).
export async function icraDosyalariniListele(arama?: string) {
  return prisma.davaDosyasi.findMany({
    where: {
      tur: { kod: "icra_dosyasi" },
      // Yalniz muvekkilin ALACAKLI oldugu icra dosyalari (borclu tarafi haciz yaptirmaz).
      muvekkilSifati: "ALACAKLI",
      ...(arama
        ? {
            OR: [
              ...varyantlarla(arama, (v) => ({ konu: { contains: v, mode: "insensitive" as const } })),
              ...varyantlarla(arama, (v) => ({ dosyaNo: { contains: v, mode: "insensitive" as const } })),
              ...varyantlarla(arama, (v) => ({ muvekkiller: { some: { musteri: { adSoyadUnvan: { contains: v, mode: "insensitive" as const } } } } })),
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
