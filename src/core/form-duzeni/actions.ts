"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { DAVA_DOSYASI_GIZLENEMEZ_ALANLAR } from "@/core/form-duzeni/dava-dosyasi-alanlari";
import { MUSTERI_GIZLENEMEZ_ALANLAR } from "@/core/form-duzeni/musteri-alanlari";

// Bir formun server action'i (ör. davaDosyasiOlustur) hangi alanlari
// EK OLARAK zorunlu kildigini burada da tekrarliyoruz - admin panodaki
// toggle zaten bu alanlar icin gosterilmiyor, ama dogrudan action'a
// cagri yapilsa bile (ör. ileride baska bir ekrandan) veri butunlugunu
// bozmasin diye sunucu tarafinda da engellenir.
const GIZLENEMEZ_ALANLAR: Record<string, string[]> = {
  "dava-dosyasi": DAVA_DOSYASI_GIZLENEMEZ_ALANLAR,
  musteri: MUSTERI_GIZLENEMEZ_ALANLAR,
};

// Bir formun alan duzeni degistiginde hangi liste/detay rotalarinin
// yeniden gecerlenecegi - "dava-dosyasi"/"musteri" gibi her yeni form
// eklendiginde buraya bir satir eklenir.
const FORM_ROTA_HARITASI: Record<string, string> = {
  "dava-dosyasi": "/kokpit/dava-dosyalari",
  musteri: "/kokpit/musteriler",
};

async function yetkiKontrolEt() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
}

export async function formAlanlariniYenidenSirala(formAnahtari: string, alanAnahtarSirasi: string[]) {
  await yetkiKontrolEt();

  await prisma.$transaction(
    alanAnahtarSirasi.map((alanAnahtari, index) =>
      prisma.formAlanDuzeni.update({
        where: { formAnahtari_alanAnahtari: { formAnahtari, alanAnahtari } },
        data: { siraNo: index },
      }),
    ),
  );

  revalidatePath("/kokpit/ayarlar/form-duzeni");
  if (FORM_ROTA_HARITASI[formAnahtari]) {
    revalidatePath(FORM_ROTA_HARITASI[formAnahtari], "layout");
  }
}

export async function formAlanGorunurlukDegistir(formAnahtari: string, alanAnahtari: string, gizliMi: boolean) {
  await yetkiKontrolEt();
  if (GIZLENEMEZ_ALANLAR[formAnahtari]?.includes(alanAnahtari)) return;

  await prisma.formAlanDuzeni.update({
    where: { formAnahtari_alanAnahtari: { formAnahtari, alanAnahtari } },
    data: { gizliMi },
  });

  revalidatePath("/kokpit/ayarlar/form-duzeni");
  if (FORM_ROTA_HARITASI[formAnahtari]) {
    revalidatePath(FORM_ROTA_HARITASI[formAnahtari], "layout");
  }
}
