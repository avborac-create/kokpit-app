"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { silmeSifresiniDogrula } from "@/core/auth/silme-dogrulama";
import { etkinAnlasma, kdvliTutar } from "@/modules/dava-dosyasi/lib/anlasma";

function yenile() {
  revalidatePath("/kokpit", "layout");
}

const metin = (formData: FormData, alan: string) => String(formData.get(alan) ?? "").trim();
const metinVeyaNull = (formData: FormData, alan: string) => metin(formData, alan) || null;

function sayiVeyaNull(formData: FormData, alan: string): number | null {
  const ham = metin(formData, alan).replace(",", ".");
  if (!ham) return null;
  const n = Number(ham);
  if (!Number.isFinite(n) || n < 0) throw new Error("Tutar geçerli bir sayı olmalıdır.");
  return Math.round(n * 100) / 100;
}

// Anlasmayi kaydeder: dosyaId bossa muvekkil geneli, doluysa o dosyaya ozel.
export async function anlasmaKaydet(musteriId: string, dosyaId: string, formData: FormData) {
  const kullanici = await mevcutKullanici();
  if (!kullanici) throw new Error("Bu işlem için oturum açmalısınız.");
  const kapsamDosyaId = dosyaId || null;
  if (kapsamDosyaId) {
    const sayac = await prisma.dosyaMuvekkili.count({ where: { dosyaId: kapsamDosyaId, musteriId } });
    if (sayac === 0) throw new Error("Dosya bu müvekkile ait değil.");
  }

  const kdv = metin(formData, "kdv");
  const kdvOrani = sayiVeyaNull(formData, "kdvOrani") ?? 20;
  const tarihHam = metin(formData, "anlasmaTarihi");
  const veri = {
    hizmetBedeli: sayiVeyaNull(formData, "hizmetBedeli"),
    kdvDahilMi: kdv === "dahil" ? true : kdv === "haric" ? false : null,
    kdvOrani,
    odemeSekliId: metinVeyaNull(formData, "odemeSekliId"),
    odemePlani: metinVeyaNull(formData, "odemePlani"),
    basariPrimi: metinVeyaNull(formData, "basariPrimi"),
    masrafSorumlusuId: metinVeyaNull(formData, "masrafSorumlusuId"),
    anlasmaTarihi: tarihHam ? new Date(tarihHam) : null,
    belgeReferansi: metinVeyaNull(formData, "belgeReferansi"),
    notlar: metinVeyaNull(formData, "notlar"),
  };

  const mevcut = await prisma.muvekkilAnlasma.findFirst({ where: { musteriId, dosyaId: kapsamDosyaId } });
  if (mevcut) {
    await prisma.muvekkilAnlasma.update({ where: { id: mevcut.id }, data: veri });
  } else {
    await prisma.muvekkilAnlasma.create({ data: { musteriId, dosyaId: kapsamDosyaId, ...veri } });
  }
  yenile();
}

export async function anlasmaSil(id: string, sifre?: string) {
  await silmeSifresiniDogrula(sifre);
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) throw new Error("Bu işlem için yetkiniz yok.");
  await prisma.muvekkilAnlasma.delete({ where: { id } });
  yenile();
}

const AKDI_VEKALET_ISARETI = "AKDİ VEKALET — hizmet bedeli (anlaşma)";

// Hizmet bedelini (KDV'li tutar) dosyanin 101 - Akdi Vekalet hesabina BORC olarak yazar.
// Ayni dosya icin ikinci kez yazilmaz (yanlis yazildiysa defterden silip yeniden yazin).
export async function anlasmaAkdiVekaleteYaz(musteriId: string, dosyaId: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici) throw new Error("Bu işlem için oturum açmalısınız.");
  if (!dosyaId) throw new Error("Borç, bir dosya için yazılır; önce dosya sayfasından/sekmesinden deneyin.");
  const sayac = await prisma.dosyaMuvekkili.count({ where: { dosyaId, musteriId } });
  if (sayac === 0) throw new Error("Dosya bu müvekkile ait değil.");

  const { anlasma } = await etkinAnlasma(musteriId, dosyaId);
  const tutar = anlasma ? kdvliTutar(anlasma) : null;
  if (!anlasma || tutar === null || tutar <= 0) throw new Error("Önce hizmet bedelini içeren bir anlaşma girin.");

  const hesap = await prisma.cariHesap.findFirst({ where: { eskiKod: "akdi_vekalet_hesabi" } });
  if (!hesap) throw new Error("Akdi Vekalet hesabı bulunamadı.");
  const var_ = await prisma.cariHareketi.count({ where: { musteriId, dosyaId, hesapId: hesap.id, aciklama: { startsWith: AKDI_VEKALET_ISARETI } } });
  if (var_ > 0) throw new Error("Bu dosya için anlaşma bedeli zaten Akdi Vekalet'e yazılmış.");

  const kdvNotu = anlasma.kdvDahilMi === false ? ` (KDV %${anlasma.kdvOrani} dahil)` : anlasma.kdvDahilMi ? " (KDV dahil)" : "";
  await prisma.cariHareketi.create({
    data: {
      musteriId,
      dosyaId,
      hesapId: hesap.id,
      yon: "BORC",
      tarih: anlasma.anlasmaTarihi ?? new Date(),
      tutar,
      aciklama: AKDI_VEKALET_ISARETI + kdvNotu,
    },
  });
  yenile();
}
