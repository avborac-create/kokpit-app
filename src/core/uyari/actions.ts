"use server";

import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";

// Yazılımın her yerindeki uyarı/işler için ortak eylemler: "Takvime aktar" ve "Görev oluştur".

function tarihDogrula(tarih: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) throw new Error("Geçerli bir tarih seçin.");
  return new Date(`${tarih}T12:00:00`);
}

export async function uyariTakvimeAktar(baslik: string, tarih: string, notlar?: string): Promise<void> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) throw new Error("Bu işlem için yetkiniz yok.");
  await prisma.takvimOgesi.create({
    data: { tarih: tarihDogrula(tarih), baslik: baslik.slice(0, 200), notlar: notlar?.slice(0, 1000) ?? null, olusturanId: kullanici.kullaniciId, sorumluId: kullanici.kullaniciId },
  });
}

export async function uyariGorevOlustur(baslik: string, aciklama: string, vade?: string): Promise<void> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) throw new Error("Bu işlem için yetkiniz yok.");
  await prisma.is.create({
    data: {
      tur: "PARCA",
      baslik: baslik.slice(0, 200),
      aciklama: aciklama.slice(0, 1000),
      vade: vade ? tarihDogrula(vade) : null,
      sorumluId: kullanici.kullaniciId,
      olusturanId: kullanici.kullaniciId,
    },
  });
}
