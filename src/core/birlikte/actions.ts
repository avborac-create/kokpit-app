"use server";

import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";

// 200 sn'den eski nabiz "ayrildi" sayilir (istemci ~90 sn'de bir nabiz atar).
const AKTIF_SURE_MS = 200_000;
// Ayrilanlarin satirlari bu sureden sonra silinir.
const TEMIZLIK_SURESI_MS = 30 * 60_000;
// Temizlik her nabizda degil, nabizlarin ~%3'unde calisir (veritabani islem sayisini dusurur).
const TEMIZLIK_OLASILIGI = 0.03;

// Acik dosyada kendini isaretler, ayni dosyada son 200 sn'de gorulen DIGER
// kullanicilarin adlarini dondurur. Ayni kisinin ikinci sekmesi sayilmaz.
// Nabiz basina 2 sorgu: updateMany (satir yoksa nadiren create) + findMany.
export async function dosyaNabziAt(dosyaId: string): Promise<string[]> {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !dosyaId) return [];

  const simdi = new Date();
  const guncellenen = await prisma.dosyaNabzi.updateMany({
    where: { dosyaId, kullaniciId: kullanici.kullaniciId },
    data: { adSoyad: kullanici.adSoyad, sonGorulme: simdi },
  });
  if (guncellenen.count === 0) {
    await prisma.dosyaNabzi.upsert({
      where: { dosyaId_kullaniciId: { dosyaId, kullaniciId: kullanici.kullaniciId } },
      create: { dosyaId, kullaniciId: kullanici.kullaniciId, adSoyad: kullanici.adSoyad, sonGorulme: simdi },
      update: { adSoyad: kullanici.adSoyad, sonGorulme: simdi },
    });
  }
  if (Math.random() < TEMIZLIK_OLASILIGI) {
    await prisma.dosyaNabzi.deleteMany({ where: { sonGorulme: { lt: new Date(simdi.getTime() - TEMIZLIK_SURESI_MS) } } });
  }

  const digerleri = await prisma.dosyaNabzi.findMany({
    where: {
      dosyaId,
      kullaniciId: { not: kullanici.kullaniciId },
      sonGorulme: { gte: new Date(simdi.getTime() - AKTIF_SURE_MS) },
    },
    select: { adSoyad: true },
    orderBy: { adSoyad: "asc" },
  });
  return digerleri.map((d) => d.adSoyad);
}
