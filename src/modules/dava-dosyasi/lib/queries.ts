import { prisma } from "@/core/db/prisma";

export type DavaDosyasiFiltre = {
  arama?: string;
  durumKod?: string;
  musteriId?: string;
};

export async function davaDosyalariniListele(filtre: DavaDosyasiFiltre = {}) {
  return prisma.davaDosyasi.findMany({
    where: {
      ...(filtre.arama
        ? {
            OR: [
              { konu: { contains: filtre.arama, mode: "insensitive" } },
              { dosyaNo: { contains: filtre.arama, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filtre.durumKod ? { durum: { kod: filtre.durumKod } } : {}),
      ...(filtre.musteriId ? { muvekkiller: { some: { musteriId: filtre.musteriId } } } : {}),
    },
    include: {
      durum: true,
      sorumluAvukat: true,
      karsiTaraf: true,
      uyusmazlikGrubu: true,
      muvekkiller: { include: { musteri: true } },
    },
    orderBy: { olusturmaTarihi: "desc" },
  });
}

export async function davaDosyasiGetir(id: string) {
  return prisma.davaDosyasi.findUnique({
    where: { id },
    include: {
      durum: true,
      sorumluAvukat: true,
      karsiTaraf: true,
      uyusmazlikGrubu: true,
      muvekkiller: { include: { musteri: true } },
      paraTrafigiKayitlari: {
        include: {
          paraTrafigi: {
            include: { tip: true, durum: true, kaynak: true, musteri: true },
          },
        },
        orderBy: { paraTrafigi: { tarih: "desc" } },
      },
      masraflar: {
        include: { cariKod: true, tur: true },
        orderBy: { tarih: "desc" },
      },
    },
  });
}

export async function musterininDosyalari(musteriId: string) {
  return prisma.davaDosyasi.findMany({
    where: { muvekkiller: { some: { musteriId } } },
    include: { durum: true, karsiTaraf: true },
    orderBy: { olusturmaTarihi: "desc" },
  });
}

export async function karsiTaraflariListele(musteriIdleri: string[]) {
  if (musteriIdleri.length === 0) return [];
  return prisma.karsiTaraf.findMany({
    where: { musteriId: { in: musteriIdleri } },
    orderBy: { ad: "asc" },
  });
}

export async function uyusmazlikGruplariniListele(musteriIdleri: string[]) {
  if (musteriIdleri.length === 0) return [];
  return prisma.uyusmazlikGrubu.findMany({
    where: { musteriId: { in: musteriIdleri } },
    orderBy: { ad: "asc" },
  });
}

// Bir dosyanin cari kod bazinda Borc/Alacak/Bakiye ozeti: tasnif = paranin
// GELIRKEN bu koda ayrilan kismi (ParaTrafigiTasnif, dosyaya baglanan
// odemeler uzerinden); masraf = o koddan SONRADAN yapilan harcamalarin
// toplami (DosyaMasrafi). Bakiye = tasnif - masraf: pozitifse o kodda
// henuz kullanilmamis/kalan bir tutar var (bkz. ARCHITECTURE.md).
export async function dosyaCariHesapOzeti(dosyaId: string) {
  const [cariKodlar, tasnifToplamlari, masrafToplamlari] = await Promise.all([
    prisma.secenekDegeri.findMany({
      where: { liste: { anahtar: "cari_kod" } },
      orderBy: { siraNo: "asc" },
    }),
    prisma.paraTrafigiTasnif.groupBy({
      by: ["cariKodId"],
      where: { paraTrafigi: { dosyalar: { some: { dosyaId } } } },
      _sum: { tutar: true },
    }),
    prisma.dosyaMasrafi.groupBy({
      by: ["cariKodId"],
      where: { dosyaId },
      _sum: { tutar: true },
    }),
  ]);

  const tasnifMap = new Map(tasnifToplamlari.map((t) => [t.cariKodId, Number(t._sum.tutar ?? 0)]));
  const masrafMap = new Map(masrafToplamlari.map((m) => [m.cariKodId, Number(m._sum.tutar ?? 0)]));

  return cariKodlar
    .map((kod) => {
      const tasnifToplami = tasnifMap.get(kod.id) ?? 0;
      const masrafToplami = masrafMap.get(kod.id) ?? 0;
      return {
        cariKod: kod,
        tasnifToplami,
        masrafToplami,
        bakiye: tasnifToplami - masrafToplami,
      };
    })
    .filter((satir) => satir.tasnifToplami !== 0 || satir.masrafToplami !== 0);
}
