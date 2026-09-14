"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { MusteriFinansIslemTuru, MusteriFinansParaAmaci } from "@prisma/client";
import { prisma } from "@/core/db/prisma";
import { ISLEM_TURU_ETIKETLERI, PARA_AMACI_ETIKETLERI } from "@/modules/muvekkil-finans/lib/sabitler";

// Kullaniciya asla ham bir Prisma/veritabani hatasi gostermemek icin: form
// alanlari once burada anlasilir Turkce mesajlarla dogrulanir, geriye kalan
// (beklenmeyen) her sey tek bir genel mesaja indirgenir (bkz. asagidaki catch).
export async function musteriFinansHareketiEkle(formData: FormData) {
  const musteriId = String(formData.get("musteriId") ?? "").trim();
  const davaDosyasiIdHam = String(formData.get("davaDosyasiId") ?? "").trim();
  const islemTuru = String(formData.get("islemTuru") ?? "").trim() as MusteriFinansIslemTuru;
  const paraAmaci = String(formData.get("paraAmaci") ?? "").trim() as MusteriFinansParaAmaci;
  const tutar = String(formData.get("tutar") ?? "").trim();
  const tarih = String(formData.get("tarih") ?? "").trim();
  const aciklama = String(formData.get("aciklama") ?? "").trim();

  if (!musteriId) {
    throw new Error("Müvekkil seçimi zorunludur.");
  }
  if (!islemTuru || !(islemTuru in ISLEM_TURU_ETIKETLERI)) {
    throw new Error("Geçerli bir işlem türü seçin.");
  }
  if (!paraAmaci || !(paraAmaci in PARA_AMACI_ETIKETLERI)) {
    throw new Error("Geçerli bir para amacı seçin.");
  }
  if (!tutar || !Number.isFinite(Number(tutar)) || Number(tutar) <= 0) {
    throw new Error("Tutar sıfırdan büyük bir sayı olmalıdır.");
  }
  if (!tarih) {
    throw new Error("Tarih zorunludur.");
  }

  const musteriVarMi = await prisma.musteri.findUnique({ where: { id: musteriId }, select: { id: true } });
  if (!musteriVarMi) {
    throw new Error("Seçilen müvekkil bulunamadı.");
  }

  try {
    await prisma.musteriFinansHareketi.create({
      data: {
        musteriId,
        davaDosyasiId: davaDosyasiIdHam || null,
        islemTuru,
        paraAmaci,
        tutar,
        tarih: new Date(tarih),
        aciklama: aciklama || null,
      },
    });
  } catch (hata) {
    if (hata instanceof Prisma.PrismaClientKnownRequestError && hata.code === "P2003") {
      throw new Error("Seçilen dosya bulunamadı. Lütfen listeden tekrar seçin.");
    }
    throw new Error("Hareket kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.");
  }

  revalidatePath("/kokpit/muvekkil-finans");
}
