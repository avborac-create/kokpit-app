import { prisma } from "@/core/db/prisma";

export type IcraDosyasiAday = {
  id: string;
  dosyaNo: string | null;
  konu: string;
  kayitNo: number;
  hukukiIliskiTuru: { etiket: string } | null;
  karsiTaraflar: { karsiTaraf: { ad: string } }[];
};

// "İcra Dosyası" combobox'ının arama kutusu icin hafif sorgu - Haciz
// Raporu formu YALNIZCA icra turundeki dosyalar arasindan secim yaptirir
// (bkz. dosya_turu secenek listesi). Dosya no VE borclu (karsi taraf)
// adina gore arar - ikisi de kullanicinin elindeki bilgi olabilir.
export async function icraDosyasiAdaylariniAra(arama: string): Promise<IcraDosyasiAday[]> {
  const temizlenmisArama = arama.trim();
  return prisma.davaDosyasi.findMany({
    where: {
      tur: { kod: { in: ["esas_icra_dosyasi", "talimat_dosyasi", "ihtiyati_haciz_dosyasi"] } },
      ...(temizlenmisArama
        ? {
            OR: [
              { dosyaNo: { contains: temizlenmisArama, mode: "insensitive" } },
              { konu: { contains: temizlenmisArama, mode: "insensitive" } },
              { karsiTaraflar: { some: { karsiTaraf: { ad: { contains: temizlenmisArama, mode: "insensitive" } } } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      dosyaNo: true,
      konu: true,
      kayitNo: true,
      hukukiIliskiTuru: { select: { etiket: true } },
      karsiTaraflar: { select: { karsiTaraf: { select: { ad: true } } } },
    },
    orderBy: { olusturmaTarihi: "desc" },
    take: 20,
  });
}

export async function hacizRaporlariniListele() {
  return prisma.hacizRaporu.findMany({
    include: {
      icraDosyasi: { include: { karsiTaraflar: { include: { karsiTaraf: true } } } },
      muhafaza: true,
      istihkak: true,
      kiymetTakdiri: true,
    },
    orderBy: { hacizTarihi: "desc" },
  });
}
