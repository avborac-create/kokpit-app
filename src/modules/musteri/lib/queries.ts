import { prisma } from "@/core/db/prisma";

export type MusteriFiltre = {
  arama?: string;
  durumKod?: string;
  sorumluAvukatId?: string;
};

// Türkçe uyumlu katlama: I/ı/İ/i hepsi "i" olur, diğer harfler Türkçe küçültmeyle eşlenir.
function turkceKatla(metin: string): string {
  return metin
    .replace(/[Iıİ]/g, "i")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFC");
}

export async function musterileriListele(filtre: MusteriFiltre = {}) {
  const aranan = filtre.arama?.trim() ? turkceKatla(filtre.arama.trim()) : "";
  const liste = await musterileriGetir(filtre);
  return aranan ? liste.filter((m) => turkceKatla(m.adSoyadUnvan).includes(aranan)) : liste;
}

async function musterileriGetir(filtre: MusteriFiltre) {
  return prisma.musteri.findMany({
    where: {
      ...(filtre.durumKod ? { durum: { kod: filtre.durumKod } } : {}),
      ...(filtre.sorumluAvukatId ? { sorumluAvukatId: filtre.sorumluAvukatId } : {}),
    },
    include: {
      tip: true,
      durum: true,
      sorumluAvukat: true,
      _count: { select: { paraTrafigi: true } },
    },
    orderBy: { adSoyadUnvan: "asc" },
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
      telefonlar: { orderBy: [{ siraNo: "asc" }, { olusturmaTarihi: "asc" }] },
    },
  });
}

export async function paraTrafigiKaydiGetir(kayitId: string) {
  return prisma.musteriParaTrafigi.findUnique({
    where: { id: kayitId },
    include: {
      dosyalar: true,
      tasnif: true,
      dagitimlar: true,
    },
  });
}

export async function avukatlariListele() {
  return prisma.kullanici.findMany({
    where: { aktifMi: true },
    orderBy: { adSoyad: "asc" },
  });
}
