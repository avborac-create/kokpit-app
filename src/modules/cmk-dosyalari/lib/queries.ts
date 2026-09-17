import { prisma } from "@/core/db/prisma";
import type { CMKDosyaDurumu, Prisma } from "@prisma/client";

// CMK dosyasi formundaki "mevcut musteriye bagla" secicisini doldurmak
// icin hafif liste - bkz. cmk-formu.tsx.
export async function musterileriCMKIcinListele() {
  return prisma.musteri.findMany({
    orderBy: { adSoyadUnvan: "asc" },
    select: { id: true, adSoyadUnvan: true },
  });
}

// Birim filtresini serbest metin yerine mevcut kayitlardaki degerlerden
// bir acilir listeye cevirir - yazim hatasini/tutarsizligi onler.
export async function cmkBirimleriListele() {
  const satirlar = await prisma.cMKDosyasi.findMany({
    distinct: ["birim"],
    select: { birim: true },
    orderBy: { birim: "asc" },
  });
  return satirlar.map((s) => s.birim);
}

export type CMKDosyaFiltre = {
  arama?: string;
  dosyaDurumu?: CMKDosyaDurumu;
  birim?: string;
  durusmaTarihi?: string; // YYYY-MM-DD - o gune ait durusmalar
  sonrakiKontrolTarihiKadar?: string; // YYYY-MM-DD - bu tarihe kadar (gecikmisler dahil) kontrol gerekenler
};

// Bir "YYYY-MM-DD" gunune ait DateTime alani icin [00:00, 24:00) araligi -
// saat bilgisinden bagimsiz "o gun" eslesmesi.
function gunAraligi(gun: string): { gte: Date; lt: Date } {
  const baslangic = new Date(`${gun}T00:00:00`);
  const bitis = new Date(baslangic);
  bitis.setDate(bitis.getDate() + 1);
  return { gte: baslangic, lt: bitis };
}

export async function cmkDosyalariniListele(filtre: CMKDosyaFiltre = {}) {
  const where: Prisma.CMKDosyasiWhereInput = {
    ...(filtre.arama
      ? {
          OR: [
            { adSoyad: { contains: filtre.arama, mode: "insensitive" } },
            { musteri: { adSoyadUnvan: { contains: filtre.arama, mode: "insensitive" } } },
            { dosyaNo: { contains: filtre.arama, mode: "insensitive" } },
            { birim: { contains: filtre.arama, mode: "insensitive" } },
            { suc: { contains: filtre.arama, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filtre.dosyaDurumu ? { dosyaDurumu: filtre.dosyaDurumu } : {}),
    ...(filtre.birim ? { birim: filtre.birim } : {}),
    ...(filtre.durusmaTarihi ? { durusmaTarihi: gunAraligi(filtre.durusmaTarihi) } : {}),
    ...(filtre.sonrakiKontrolTarihiKadar
      ? { sonrakiKontrolTarihi: { lte: gunAraligi(filtre.sonrakiKontrolTarihiKadar).lt } }
      : {}),
  };

  return prisma.cMKDosyasi.findMany({
    where,
    include: { musteri: { select: { id: true, adSoyadUnvan: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function cmkDosyasiGetir(id: string) {
  return prisma.cMKDosyasi.findUnique({ where: { id } });
}

// Ana ekranin ust seridinde "yaklasan durusma"/"gecikmis kontrol" sayilarini
// gosterir - bkz. cmk-ozet-seridi.tsx. Uygulanan filtrelerden BAGIMSIZ,
// her zaman TUM kayitlar uzerinden hesaplanir (kullanici hangi filtreyi
// secerse secsin bu sayilar sabit/guvenilir kalir).
export async function cmkOzetSayilariniHesapla() {
  const simdi = new Date();
  const yediGunSonra = new Date(simdi);
  yediGunSonra.setDate(yediGunSonra.getDate() + 7);

  const [yaklasanDurusma, gecikmisKontrol] = await Promise.all([
    prisma.cMKDosyasi.count({
      where: { durusmaTarihi: { gte: simdi, lte: yediGunSonra } },
    }),
    prisma.cMKDosyasi.count({
      where: { sonrakiKontrolTarihi: { lt: simdi } },
    }),
  ]);

  return { yaklasanDurusma, gecikmisKontrol };
}
