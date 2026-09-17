"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import type { CMKDosyaDurumu } from "@prisma/client";
import { prisma } from "@/core/db/prisma";
import { DOSYA_DURUMU_ETIKETLERI } from "@/modules/cmk-dosyalari/lib/sabitler";

function metinYaAlNull(formData: FormData, alan: string): string | null {
  const deger = String(formData.get(alan) ?? "").trim();
  return deger === "" ? null : deger;
}

function tarihYaAlNull(formData: FormData, alan: string): Date | null {
  const deger = String(formData.get(alan) ?? "").trim();
  return deger === "" ? null : new Date(deger);
}

type CMKAlanlari = {
  musteriId: string | null;
  adSoyad: string;
  telefon: string | null;
  smsGonderilebilirMi: boolean;
  cmkGorevlendirmeVarMi: boolean;
  suc: string;
  birim: string;
  dosyaNo: string;
  durusmaTarihi: Date | null;
  dosyaDurumu: CMKDosyaDurumu;
  hukum: string | null;
  cezaMiktari: string | null;
  sonrakiKontrolTarihi: Date | null;
  notlar: string | null;
};

// Form verisini dogrular ve temizler; hem olustur hem guncelle burayi
// paylasir (bkz. ARCHITECTURE.md "CMK Dosyalari" - tek dogrulama noktasi).
// Kullaniciya asla ham bir veritabani hatasi gostermemek icin butun
// zorunlu/format kontrolleri burada, anlasilir Turkce mesajlarla yapilir.
async function formVerisiniHazirla(formData: FormData): Promise<CMKAlanlari> {
  const musteriId = metinYaAlNull(formData, "musteriId");
  let adSoyad = metinYaAlNull(formData, "adSoyad");
  let telefon = metinYaAlNull(formData, "telefon");
  const suc = metinYaAlNull(formData, "suc");
  const birim = metinYaAlNull(formData, "birim");
  const dosyaNo = metinYaAlNull(formData, "dosyaNo");
  const dosyaDurumu = String(formData.get("dosyaDurumu") ?? "").trim() as CMKDosyaDurumu;

  if (!musteriId && !adSoyad) {
    throw new Error("Müvekkil seçin veya ad soyad girin.");
  }
  if (!suc) {
    throw new Error("Suç alanı zorunludur.");
  }
  if (!birim) {
    throw new Error("Birim alanı zorunludur.");
  }
  if (!dosyaNo) {
    throw new Error("Dosya No alanı zorunludur.");
  }
  if (!dosyaDurumu || !(dosyaDurumu in DOSYA_DURUMU_ETIKETLERI)) {
    throw new Error("Geçerli bir dosya durumu seçin.");
  }

  // Musteri secilip ad soyad/telefon bos birakildiysa, secilen musterinin
  // kendi bilgileriyle otomatik doldurulur (bkz. sema yorumu) - liste ve
  // arama hep bu alandan hizlica calisir, join gerekmez.
  if (musteriId && !adSoyad) {
    const musteri = await prisma.musteri.findUnique({
      where: { id: musteriId },
      select: { adSoyadUnvan: true, telefon: true },
    });
    if (!musteri) {
      throw new Error("Seçilen müvekkil bulunamadı.");
    }
    adSoyad = musteri.adSoyadUnvan;
    if (!telefon) telefon = musteri.telefon;
  }

  return {
    musteriId,
    adSoyad: adSoyad!,
    telefon,
    smsGonderilebilirMi: formData.get("smsGonderilebilirMi") === "on",
    cmkGorevlendirmeVarMi: formData.get("cmkGorevlendirmeVarMi") === "on",
    suc,
    birim,
    dosyaNo,
    durusmaTarihi: tarihYaAlNull(formData, "durusmaTarihi"),
    dosyaDurumu,
    hukum: metinYaAlNull(formData, "hukum"),
    cezaMiktari: metinYaAlNull(formData, "cezaMiktari"),
    sonrakiKontrolTarihi: tarihYaAlNull(formData, "sonrakiKontrolTarihi"),
    notlar: metinYaAlNull(formData, "notlar"),
  };
}

function ayniDosyaHatasiMi(hata: unknown): boolean {
  return hata instanceof Prisma.PrismaClientKnownRequestError && hata.code === "P2002";
}

export async function cmkDosyasiOlustur(formData: FormData) {
  const veri = await formVerisiniHazirla(formData);

  let yeniDosya;
  try {
    yeniDosya = await prisma.cMKDosyasi.create({ data: veri });
  } catch (hata) {
    if (ayniDosyaHatasiMi(hata)) {
      throw new Error(
        `"${veri.birim}" biriminde "${veri.dosyaNo}" numaralı bir CMK dosyası zaten kayıtlı.`,
      );
    }
    throw new Error("Dosya kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.");
  }

  revalidatePath("/kokpit/cmk-dosyalari");
  redirect(`/kokpit/cmk-dosyalari?vurgu=${yeniDosya.id}`);
}

export async function cmkDosyasiGuncelle(id: string, formData: FormData) {
  const veri = await formVerisiniHazirla(formData);

  try {
    await prisma.cMKDosyasi.update({ where: { id }, data: veri });
  } catch (hata) {
    if (ayniDosyaHatasiMi(hata)) {
      throw new Error(
        `"${veri.birim}" biriminde "${veri.dosyaNo}" numaralı başka bir CMK dosyası zaten kayıtlı.`,
      );
    }
    throw new Error("Dosya güncellenemedi. Bilgileri kontrol edip tekrar deneyin.");
  }

  revalidatePath("/kokpit/cmk-dosyalari");
  redirect(`/kokpit/cmk-dosyalari?vurgu=${id}`);
}
