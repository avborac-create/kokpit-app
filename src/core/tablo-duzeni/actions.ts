"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { DAVA_DOSYALARI_GIZLENEMEZ_SUTUNLAR } from "@/core/tablo-duzeni/dava-dosyalari-sutunlari";

const GIZLENEMEZ_SUTUNLAR: Record<string, string[]> = {
  "dava-dosyalari": DAVA_DOSYALARI_GIZLENEMEZ_SUTUNLAR,
};

async function yetkiKontrolEt() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
}

export async function sutunlariYenidenSirala(tabloAnahtari: string, sutunAnahtarSirasi: string[]) {
  await yetkiKontrolEt();

  await prisma.$transaction(
    sutunAnahtarSirasi.map((sutunAnahtari, index) =>
      prisma.tabloSutunDuzeni.update({
        where: { tabloAnahtari_sutunAnahtari: { tabloAnahtari, sutunAnahtari } },
        data: { siraNo: index },
      }),
    ),
  );

  revalidatePath("/kokpit/ayarlar/sutun-duzeni");
  revalidatePath("/kokpit/dava-dosyalari", "layout");
}

export async function sutunGorunurlukDegistir(tabloAnahtari: string, sutunAnahtari: string, gizliMi: boolean) {
  await yetkiKontrolEt();
  if (GIZLENEMEZ_SUTUNLAR[tabloAnahtari]?.includes(sutunAnahtari)) return;

  await prisma.tabloSutunDuzeni.update({
    where: { tabloAnahtari_sutunAnahtari: { tabloAnahtari, sutunAnahtari } },
    data: { gizliMi },
  });

  revalidatePath("/kokpit/ayarlar/sutun-duzeni");
  revalidatePath("/kokpit/dava-dosyalari", "layout");
}
