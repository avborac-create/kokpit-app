"use server";

import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";

// 45 sn'den eski nabiz "ayrildi" sayilir (istemci ~20 sn'de bir nabiz atar).
const AKTIF_SURE_MS = 45_000;
// Ayrilanlarin satirlari bu sureden sonra silinir.
const TEMIZLIK_SURESI_MS = 10 * 60_000;

// Acik dosyada kendini isaretler, ayni dosyada son 45 sn'de gorulen DIGER
// kullanicilarin adlarini dondurur. Ayni kisinin ikinci sekmesi sayilmaz.
export async function dosyaNabziAt(dosyaId: string): Promise<string[]> {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !dosyaId) return [];

  const simdi = new Date();
  await prisma.dosyaNabzi.upsert({
    where: { dosyaId_kullaniciId: { dosyaId, kullaniciId: kullanici.kullaniciId } },
    create: { dosyaId, kullaniciId: kullanici.kullaniciId, adSoyad: kullanici.adSoyad, sonGorulme: simdi },
    update: { adSoyad: kullanici.adSoyad, sonGorulme: simdi },
  });
  await prisma.dosyaNabzi.deleteMany({ where: { sonGorulme: { lt: new Date(simdi.getTime() - TEMIZLIK_SURESI_MS) } } });

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
