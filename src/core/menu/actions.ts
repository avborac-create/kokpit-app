"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";

// "Ayarlar" gizlenirse kullanici bu ayari degistirebilecegi ekrana bir daha
// kolayca ulasamaz (URL'yi ezbere bilmesi gerekir) - bu yuzden gizlenmesi
// sunucu tarafinda da engellenir (UI'da zaten teklif edilmiyor).
const GIZLENEMEZ_ANAHTAR = "ayarlar";

async function yetkiKontrolEt() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
}

export async function menuYenidenSirala(anahtarSirasi: string[]) {
  await yetkiKontrolEt();

  await prisma.$transaction(
    anahtarSirasi.map((anahtar, index) =>
      prisma.menuOgesi.update({ where: { anahtar }, data: { siraNo: index } }),
    ),
  );

  revalidatePath("/kokpit", "layout");
}

export async function menuGorunurlukDegistir(anahtar: string, gizliMi: boolean) {
  await yetkiKontrolEt();
  if (anahtar === GIZLENEMEZ_ANAHTAR) return;

  await prisma.menuOgesi.update({ where: { anahtar }, data: { gizliMi } });
  revalidatePath("/kokpit", "layout");
}
