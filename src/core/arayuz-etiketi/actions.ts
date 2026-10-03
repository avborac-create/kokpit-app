"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";

// Baslik/etiket degisiklikleri TUM kullanicilari etkiledigi icin yalnizca
// yonetici yetkisiyle yapilir. Bos metin = varsayilana don (kayit silinir).
export async function etiketleriKaydet(degisiklikler: Record<string, string>) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Başlıkları ve etiketleri yalnızca yönetici değiştirebilir.");
  }

  const islemler = Object.entries(degisiklikler).map(([anahtar, ham]) => {
    const metin = ham.trim().slice(0, 120);
    if (!/^[a-z0-9._-]{1,120}$/i.test(anahtar)) throw new Error("Geçersiz etiket anahtarı.");
    return metin === ""
      ? prisma.arayuzEtiketi.deleteMany({ where: { anahtar } })
      : prisma.arayuzEtiketi.upsert({
          where: { anahtar },
          update: { metin },
          create: { anahtar, metin },
        });
  });
  await prisma.$transaction(islemler);
  revalidatePath("/kokpit", "layout");
}
