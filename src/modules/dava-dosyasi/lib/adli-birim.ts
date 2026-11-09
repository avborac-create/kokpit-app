"use server";

import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { ADLIYELER, BIRIM_TURLERI, birimAdiOlustur } from "./adli-birim-sabitleri";

export async function adliBirimleriListele(): Promise<string[]> {
  const satirlar = await prisma.adliBirim.findMany({ select: { ad: true } });
  return satirlar.map((s) => s.ad).sort((a, b) => a.localeCompare(b, "tr"));
}

// Katalogda olmayan bir birim adi kaydedilemez. Degismemis eski deger (mevcut)
// kontrol edilmez; boylece eski kayitlar baska alan duzenlenirken kilitlenmez.
export async function birimKatalogHatasi(birim: string | null, mevcut?: string | null): Promise<string | null> {
  if (!birim || birim === mevcut) return null;
  const var_ = await prisma.adliBirim.findUnique({ where: { ad: birim }, select: { id: true } });
  return var_
    ? null
    : "Bu birim katalogda yok. Listeden seçin ya da “Yeni birim ekle” ile adliye, tür ve sıra numarasını seçerek ekleyin.";
}

export async function adliBirimEkle(
  adliye: string,
  tur: string,
  siraMetni: string,
): Promise<{ ad: string } | { hata: string }> {
  if (!(await mevcutKullanici())) return { hata: "Oturum bulunamadı." };
  // Adliye serbest yazilabilir; listedekiyle (buyuk/kucuk harf farki olmadan) eslesirse listedeki yazim kullanilir.
  adliye = adliye.trim().replace(/\s+/g, " ");
  if (adliye.length < 2 || adliye.length > 60) return { hata: "Adliye adını yazın (en az 2, en çok 60 karakter)." };
  const kanonik = ADLIYELER.find((a) => a.toLocaleLowerCase("tr-TR") === adliye.toLocaleLowerCase("tr-TR"));
  adliye = kanonik ?? adliye;
  const turBilgisi = BIRIM_TURLERI.find((t) => t.ad === tur);
  if (!turBilgisi) return { hata: "Birim türünü listeden seçin." };
  let sira: number | null = null;
  if (turBilgisi.numarali) {
    sira = /^\d{1,3}$/.test(siraMetni.trim()) ? Number(siraMetni.trim()) : 0;
    if (!sira) return { hata: "Sıra numarasını rakamla girin (ör. 19)." };
  }
  const ad = birimAdiOlustur(adliye, tur, sira);
  await prisma.adliBirim.upsert({ where: { ad }, update: {}, create: { ad, adliye, tur, sira } });
  return { ad };
}
