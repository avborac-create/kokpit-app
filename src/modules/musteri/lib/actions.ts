"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";

function metinYaAlNull(formData: FormData, alan: string): string | null {
  const deger = String(formData.get(alan) ?? "").trim();
  return deger === "" ? null : deger;
}

// Kullanici "yavuz sirin" da yazsa "YAVUZ ŞİRİN" de yazsa fihriste hep
// buyuk harfle, tutarli gorunsun diye - Turkce'ye ozgu i/İ, ı/I
// donusumunun dogru calismasi icin (JS'in dil-bagimsiz toUpperCase'i
// "i"yi "I"ya cevirir, Turkce'de "İ" olmasi gerekir) toLocaleUpperCase
// ile "tr-TR" locale'i ACIKCA verilir.
function buyukHarfeCevir(metin: string): string {
  return metin.toLocaleUpperCase("tr-TR");
}

export async function musteriOlustur(formData: FormData) {
  const adSoyadUnvan = buyukHarfeCevir(String(formData.get("adSoyadUnvan") ?? "").trim());
  const tipId = String(formData.get("tipId") ?? "");
  const durumId = String(formData.get("durumId") ?? "");

  if (!adSoyadUnvan || !tipId || !durumId) {
    throw new Error("Ad/Soyad/Unvan, tip ve durum alanları zorunludur.");
  }

  const musteri = await prisma.musteri.create({
    data: {
      adSoyadUnvan,
      tipId,
      durumId,
      telefon: metinYaAlNull(formData, "telefon"),
      eposta: metinYaAlNull(formData, "eposta"),
      adres: metinYaAlNull(formData, "adres"),
      sorumluAvukatId: metinYaAlNull(formData, "sorumluAvukatId"),
      notlar: metinYaAlNull(formData, "notlar"),
    },
  });

  revalidatePath("/kokpit/musteriler");
  redirect(`/kokpit/musteriler/${musteri.id}`);
}

export async function musteriGuncelle(id: string, formData: FormData) {
  const adSoyadUnvan = buyukHarfeCevir(String(formData.get("adSoyadUnvan") ?? "").trim());
  const tipId = String(formData.get("tipId") ?? "");
  const durumId = String(formData.get("durumId") ?? "");

  if (!adSoyadUnvan || !tipId || !durumId) {
    throw new Error("Ad/Soyad/Unvan, tip ve durum alanları zorunludur.");
  }

  await prisma.musteri.update({
    where: { id },
    data: {
      adSoyadUnvan,
      tipId,
      durumId,
      telefon: metinYaAlNull(formData, "telefon"),
      eposta: metinYaAlNull(formData, "eposta"),
      adres: metinYaAlNull(formData, "adres"),
      sorumluAvukatId: metinYaAlNull(formData, "sorumluAvukatId"),
      notlar: metinYaAlNull(formData, "notlar"),
    },
  });

  revalidatePath("/kokpit/musteriler");
  revalidatePath(`/kokpit/musteriler/${id}`);
  redirect(`/kokpit/musteriler/${id}`);
}

export async function musteriSil(id: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.musteri.delete({ where: { id } });
  revalidatePath("/kokpit/musteriler");
  redirect("/kokpit/musteriler");
}

// Tip "Karma" degilse tasnifin tamamı otomatik olarak bu tip'in karşılığı
// olan tek cari koda yazılır (bkz. ARCHITECTURE.md - Tip = tasnifin baskın
// türü). "kod" alanları admin panelinden (ileride) düzenlenebilir hale
// gelse de kalıcı/değişmez tutulacağı için bu eşleme güvenlidir.
const TIP_KOD_ILE_ESLESEN_CARI_KOD_KODU: Record<string, string> = {
  masraf: "masraf_hesabi",
  bloke_para: "bloke_paralar",
  akdi_vekalet: "akdi_vekalet_hesabi",
  aktarilacak_para: "emanet_hesabi",
};

// Bu tiplerde Dosya Kumesi secimi ZORUNLU - dosya masrafi/bloke para/
// vekalet ucreti/avans talebi her zaman somut bir kumeye ait olmalidir.
// "muvekkilden_para_geldi" bilerek DISINDA: genel bir tahsilat once
// kumesiz girilip sonradan dagitim satirlariyla boluşturulebilir.
const KUME_ZORUNLU_TIP_KODLARI = ["masraf", "bloke_para", "akdi_vekalet", "avans_talebi"];

type DagitimSatiri = { uyusmazlikGrubuId: string; dosyaId: string | null; kullanimAmaciId: string; tutar: string };

function dagitimSatirlariniAl(formData: FormData): DagitimSatiri[] {
  const kumeIdleri = formData.getAll("dagitimKumeId").map(String);
  const dosyaIdleri = formData.getAll("dagitimDosyaId").map(String);
  const amaciIdleri = formData.getAll("dagitimAmaciId").map(String);
  const tutarlar = formData.getAll("dagitimTutar").map(String);

  return kumeIdleri
    .map((uyusmazlikGrubuId, i) => ({
      uyusmazlikGrubuId,
      dosyaId: dosyaIdleri[i]?.trim() || null,
      kullanimAmaciId: amaciIdleri[i] ?? "",
      tutar: tutarlar[i] ?? "",
    }))
    .filter((satir) => satir.uyusmazlikGrubuId && satir.kullanimAmaciId && Number(satir.tutar) > 0);
}

export async function paraTrafigiKaydiEkle(musteriId: string, formData: FormData) {
  const tarih = String(formData.get("tarih") ?? "");
  const tipId = String(formData.get("tipId") ?? "");
  const durumId = String(formData.get("durumId") ?? "");
  const kaynakId = String(formData.get("kaynakId") ?? "");
  const tutar = String(formData.get("tutar") ?? "");
  const dosyaIdleri = formData.getAll("dosyaIds").map(String).filter(Boolean);
  const uyusmazlikGrubuId = metinYaAlNull(formData, "uyusmazlikGrubuId");

  if (!tarih || !tipId || !durumId || !kaynakId || !tutar) {
    throw new Error("Tarih, tip, durum, kaynak ve tutar alanları zorunludur.");
  }

  const tip = await prisma.secenekDegeri.findUnique({ where: { id: tipId } });
  if (tip && KUME_ZORUNLU_TIP_KODLARI.includes(tip.kod) && !uyusmazlikGrubuId) {
    throw new Error("Bu tür için Dosya Kümesi seçimi zorunludur.");
  }

  const dagitimSatirlari = tip?.kod === "muvekkilden_para_geldi" ? dagitimSatirlariniAl(formData) : [];
  const dagitimToplami = dagitimSatirlari.reduce((t, s) => t + Number(s.tutar), 0);
  if (dagitimToplami > Number(tutar) + 0.01) {
    throw new Error(
      `Dağıtım toplamı (${dagitimToplami.toFixed(2)} TL), gelen tutarı (${Number(tutar).toFixed(2)} TL) aşıyor.`,
    );
  }

  const eslesenCariKodKodu = tip ? TIP_KOD_ILE_ESLESEN_CARI_KOD_KODU[tip.kod] : undefined;

  let tasnifSatirlari: { cariKodId: string; tutar: string }[] = [];
  if (dagitimSatirlari.length === 0 && eslesenCariKodKodu) {
    const cariKod = await prisma.secenekDegeri.findFirst({
      where: { kod: eslesenCariKodKodu, liste: { anahtar: "cari_kod" } },
    });
    if (cariKod) {
      tasnifSatirlari = [{ cariKodId: cariKod.id, tutar }];
    }
  } else if (dagitimSatirlari.length === 0) {
    for (const [anahtar, deger] of formData.entries()) {
      if (anahtar.startsWith("tasnif_") && String(deger).trim() !== "") {
        tasnifSatirlari.push({ cariKodId: anahtar.slice("tasnif_".length), tutar: String(deger) });
      }
    }
  }

  await prisma.musteriParaTrafigi.create({
    data: {
      musteriId,
      tarih: new Date(tarih),
      tipId,
      durumId,
      kaynakId,
      tutar,
      aciklama: metinYaAlNull(formData, "aciklama"),
      uyusmazlikGrubuId,
      dosyalar: {
        create: dosyaIdleri.map((dosyaId) => ({ dosyaId })),
      },
      tasnif: {
        create: tasnifSatirlari.map(({ cariKodId, tutar }) => ({ cariKodId, tutar })),
      },
      dagitimlar: {
        create: dagitimSatirlari.map((s) => ({
          uyusmazlikGrubuId: s.uyusmazlikGrubuId,
          dosyaId: s.dosyaId,
          kullanimAmaciId: s.kullanimAmaciId,
          tutar: s.tutar,
        })),
      },
    },
  });

  revalidatePath(`/kokpit/musteriler/${musteriId}`);
}

export async function paraTrafigiKaydiGuncelle(musteriId: string, kayitId: string, formData: FormData) {
  const tarih = String(formData.get("tarih") ?? "");
  const tipId = String(formData.get("tipId") ?? "");
  const durumId = String(formData.get("durumId") ?? "");
  const kaynakId = String(formData.get("kaynakId") ?? "");
  const tutar = String(formData.get("tutar") ?? "");
  const dosyaIdleri = formData.getAll("dosyaIds").map(String).filter(Boolean);
  const uyusmazlikGrubuId = metinYaAlNull(formData, "uyusmazlikGrubuId");

  if (!tarih || !tipId || !durumId || !kaynakId || !tutar) {
    throw new Error("Tarih, tip, durum, kaynak ve tutar alanları zorunludur.");
  }

  const tip = await prisma.secenekDegeri.findUnique({ where: { id: tipId } });
  if (tip && KUME_ZORUNLU_TIP_KODLARI.includes(tip.kod) && !uyusmazlikGrubuId) {
    throw new Error("Bu tür için Dosya Kümesi seçimi zorunludur.");
  }

  const dagitimSatirlari = tip?.kod === "muvekkilden_para_geldi" ? dagitimSatirlariniAl(formData) : [];
  const dagitimToplami = dagitimSatirlari.reduce((t, s) => t + Number(s.tutar), 0);
  if (dagitimToplami > Number(tutar) + 0.01) {
    throw new Error(
      `Dağıtım toplamı (${dagitimToplami.toFixed(2)} TL), gelen tutarı (${Number(tutar).toFixed(2)} TL) aşıyor.`,
    );
  }

  const eslesenCariKodKodu = tip ? TIP_KOD_ILE_ESLESEN_CARI_KOD_KODU[tip.kod] : undefined;

  let tasnifSatirlari: { cariKodId: string; tutar: string }[] = [];
  if (dagitimSatirlari.length === 0 && eslesenCariKodKodu) {
    const cariKod = await prisma.secenekDegeri.findFirst({
      where: { kod: eslesenCariKodKodu, liste: { anahtar: "cari_kod" } },
    });
    if (cariKod) {
      tasnifSatirlari = [{ cariKodId: cariKod.id, tutar }];
    }
  } else if (dagitimSatirlari.length === 0) {
    for (const [anahtar, deger] of formData.entries()) {
      if (anahtar.startsWith("tasnif_") && String(deger).trim() !== "") {
        tasnifSatirlari.push({ cariKodId: anahtar.slice("tasnif_".length), tutar: String(deger) });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.paraTrafigiTasnif.deleteMany({ where: { paraTrafigiId: kayitId } });
    await tx.paraTrafigiDosyasi.deleteMany({ where: { paraTrafigiId: kayitId } });
    await tx.paraTrafigiDagitimi.deleteMany({ where: { paraTrafigiId: kayitId } });

    await tx.musteriParaTrafigi.update({
      where: { id: kayitId },
      data: {
        tarih: new Date(tarih),
        tipId,
        durumId,
        kaynakId,
        tutar,
        aciklama: metinYaAlNull(formData, "aciklama"),
        uyusmazlikGrubuId,
        dosyalar: {
          create: dosyaIdleri.map((dosyaId) => ({ dosyaId })),
        },
        tasnif: {
          create: tasnifSatirlari.map(({ cariKodId, tutar }) => ({ cariKodId, tutar })),
        },
        dagitimlar: {
          create: dagitimSatirlari.map((s) => ({
            uyusmazlikGrubuId: s.uyusmazlikGrubuId,
            dosyaId: s.dosyaId,
            kullanimAmaciId: s.kullanimAmaciId,
            tutar: s.tutar,
          })),
        },
      },
    });
  });

  revalidatePath(`/kokpit/finans/musteri-iliskileri/${musteriId}/cari-hesap`);
  revalidatePath(`/kokpit/musteriler/${musteriId}`);
  redirect(`/kokpit/finans/musteri-iliskileri/${musteriId}/cari-hesap`);
}

export async function paraTrafigiKaydiSil(musteriId: string, kayitId: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.musteriParaTrafigi.delete({ where: { id: kayitId } });
  revalidatePath(`/kokpit/musteriler/${musteriId}`);
}

export async function irtibatKisisiEkle(musteriId: string, formData: FormData) {
  const adSoyad = String(formData.get("adSoyad") ?? "").trim();
  const birincilMi = formData.get("birincilMi") === "on";

  if (!adSoyad) {
    throw new Error("Ad Soyad alanı zorunludur.");
  }

  await prisma.$transaction(async (tx) => {
    if (birincilMi) {
      await tx.irtibatKisisi.updateMany({
        where: { musteriId, birincilMi: true },
        data: { birincilMi: false },
      });
    }

    await tx.irtibatKisisi.create({
      data: {
        musteriId,
        adSoyad,
        unvanGorev: metinYaAlNull(formData, "unvanGorev"),
        konuBasligi: metinYaAlNull(formData, "konuBasligi"),
        telefon: metinYaAlNull(formData, "telefon"),
        eposta: metinYaAlNull(formData, "eposta"),
        notlar: metinYaAlNull(formData, "notlar"),
        birincilMi,
      },
    });
  });

  revalidatePath(`/kokpit/musteriler/${musteriId}`);
}

export async function irtibatKisisiSil(musteriId: string, kisiId: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.irtibatKisisi.delete({ where: { id: kisiId } });
  revalidatePath(`/kokpit/musteriler/${musteriId}`);
}
