"use server";

import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { sistemYoneticisiMi } from "@/core/auth/yetki";
import { BURO_SAHIBI, CARI_GORUNUM_ANAHTARI, cariGorunumCozumle, type CariGorunum } from "./cari-gorunum";

const anahtar = CARI_GORUNUM_ANAHTARI;

// Kisinin kendi ekrani icin sectigi gorunum (baskasini etkilemez).
export async function cariGorunumKaydet(tercih: CariGorunum): Promise<void> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) return;
  const deger = JSON.stringify(cariGorunumCozumle(tercih));
  await prisma.ekranTercihi.upsert({
    where: { sahip_anahtar: { sahip: kullanici.kullaniciId, anahtar } },
    create: { sahip: kullanici.kullaniciId, anahtar, deger },
    update: { deger },
  });
}

// Kisisel tercihi siler: kisi yeniden buro varsayilanini gorur.
export async function cariGorunumSifirla(): Promise<void> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) return;
  await prisma.ekranTercihi.deleteMany({ where: { sahip: kullanici.kullaniciId, anahtar } });
}

// Yonetici: verilen gorunumu buro varsayilani yapar (kendi kisisel tercihi silinir, o da varsayilani izler).
export async function cariGorunumBuroVarsayilaniYap(tercih: CariGorunum): Promise<void> {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !sistemYoneticisiMi(kullanici.rol)) throw new Error("Bu işlem için yetkiniz yok.");
  const deger = JSON.stringify(cariGorunumCozumle(tercih));
  await prisma.$transaction([
    prisma.ekranTercihi.upsert({
      where: { sahip_anahtar: { sahip: BURO_SAHIBI, anahtar } },
      create: { sahip: BURO_SAHIBI, anahtar, deger },
      update: { deger },
    }),
    prisma.ekranTercihi.deleteMany({ where: { sahip: kullanici.kullaniciId, anahtar } }),
  ]);
}
