"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { icraDosyasiAdaylariniAra, type IcraDosyasiAday } from "@/modules/haciz-raporu/lib/queries";

function metinYaAlNull(formData: FormData, alan: string): string | null {
  const deger = String(formData.get(alan) ?? "").trim();
  return deger === "" ? null : deger;
}

// İcra Dosyası combobox'ının arama kutusu - salt okunur, sadece giriş
// yapılmış olması yeterli (bkz. bagliDosyaAra'daki aynı gerekçe).
export async function icraDosyasiAra(arama: string): Promise<IcraDosyasiAday[]> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) return [];
  return icraDosyasiAdaylariniAra(arama);
}

export async function hacizRaporuOlustur(formData: FormData) {
  const kullanici = await mevcutKullanici();
  if (!kullanici) {
    throw new Error("Bu işlem için giriş yapmanız gerekiyor.");
  }

  const icraDosyasiId = metinYaAlNull(formData, "icraDosyasiId");
  const hacizTarihiHam = metinYaAlNull(formData, "hacizTarihi");
  if (!icraDosyasiId) {
    throw new Error("İcra Dosyası seçimi zorunludur.");
  }
  if (!hacizTarihiHam) {
    throw new Error("Haciz Tarihi zorunludur.");
  }

  await prisma.hacizRaporu.create({
    data: {
      icraDosyasiId,
      hacizTarihi: new Date(hacizTarihiHam),
      islemYapan: metinYaAlNull(formData, "islemYapan"),
      irtibatNumarasi: metinYaAlNull(formData, "irtibatNumarasi"),
      muhafazaId: metinYaAlNull(formData, "muhafazaId"),
      istihkakId: metinYaAlNull(formData, "istihkakId"),
      kiymetTakdiriId: metinYaAlNull(formData, "kiymetTakdiriId"),
    },
  });

  revalidatePath("/kokpit/haciz-raporlari");
  redirect("/kokpit/haciz-raporlari");
}
