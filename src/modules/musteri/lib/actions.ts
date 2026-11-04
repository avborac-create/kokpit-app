"use server";

import { silmeSifresiniDogrula } from "@/core/auth/silme-dogrulama";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { telefonuDuzenle } from "@/modules/musteri/lib/telefon";
import { KISA_UNVAN_UYARISI, unvanKisaMi } from "@/core/unvan/unvan-kontrol";
import { unvanGoreviOlustur, unvanGoreviniKapat, eksikBilgiGoreviOlustur, eksikBilgiGoreviniKapat, adresListeGoreviOlustur } from "@/core/unvan/unvan-gorevi";
import { eksikBilgiUyarisi, telefonBosMu } from "@/core/unvan/eksik-bilgi-kontrol";

// Kisa unvan kurali: tuzel kisi ya da firma gibi gorunen ad, onay kutusu isaretli degilse kaydedilmez.
async function kisaUnvanDurumu(adSoyadUnvan: string, tipId: string, formData: FormData): Promise<boolean> {
  const tip = await prisma.secenekDegeri.findUnique({ where: { id: tipId }, select: { kod: true } });
  const kisa = unvanKisaMi(adSoyadUnvan, tip?.kod === "tuzel_kisi");
  if (kisa && formData.get("kisaUnvanOnayi") !== "1") throw new Error(KISA_UNVAN_UYARISI);
  return kisa;
}

// Telefon (rehber ya da eski not) ve adres bos mu? Form telefon rehberini hic tasimiyorsa (tel_no yok) kontrol yapilmaz.
function eksikBilgiler(formData: FormData): string[] {
  if (!formData.has("tel_no")) return [];
  const dolu = (d: FormDataEntryValue) => !telefonBosMu(String(d));
  const eksik: string[] = [];
  if (!formData.getAll("tel_no").some(dolu) && !formData.getAll("telefon").some(dolu)) eksik.push("Telefon");
  if (["adres", "il", "ilce"].some((a) => String(formData.get(a) ?? "").trim() === "")) eksik.push("Adres (il, ilçe, açık adres)");
  if (eksik.length > 0 && formData.get("eksikBilgiOnayi") !== "1") throw new Error(eksikBilgiUyarisi(eksik));
  return eksik;
}

// "Listede yok" ile elle yazilan il / ilce icin yoneticiye gorev.
async function adresListeKontrolu(formData: FormData, musteriAdi: string) {
  const il = String(formData.get("il") ?? "").trim();
  const ilce = String(formData.get("ilce") ?? "").trim();
  const ilListeDisi = formData.get("ilListeDisi") === "1" && il !== "";
  const ilceListeDisi = formData.get("ilceListeDisi") === "1" && ilce !== "";
  if (!ilListeDisi && !ilceListeDisi) return;
  const kullanici = await mevcutKullanici();
  await adresListeGoreviOlustur({ il, ilce, ilListeDisi, ilceListeDisi, musteriAdi, olusturanId: kullanici?.kullaniciId ?? null });
}

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

// Telefon rehberi satirlari: tel_no / tel_tip / tel_aidiyet / tel_sifat alanlari paralel dizilerdir.
// Bos numarali satirlar atlanir; mevcutlar silinip sirayla yeniden yazilir.
async function telefonSatirlariniYaz(musteriId: string, formData: FormData) {
  if (!formData.has("tel_no")) return; // form telefon rehberini hic tasimiyorsa dokunma
  const noLar = formData.getAll("tel_no").map(String);
  const tipler = formData.getAll("tel_tip").map(String);
  const aidiyetler = formData.getAll("tel_aidiyet").map(String);
  const sifatlar = formData.getAll("tel_sifat").map(String);
  const satirlar = noLar
    .map((no, i) => ({ no: no.trim(), tip: tipler[i] ?? "", aidiyet: (aidiyetler[i] ?? "").trim() || null, sifat: (sifatlar[i] ?? "").trim() || null }))
    .filter((s) => s.no !== "")
    .map((s, i) => {
      const sonuc = telefonuDuzenle(s.no, s.tip);
      if ("hata" in sonuc) throw new Error(`Telefon ${i + 1} (${s.no}): ${sonuc.hata}`);
      return {
        musteriId,
        siraNo: i,
        telefon: sonuc.deger,
        telefonTipi: s.tip === "CEP" || s.tip === "SABIT" ? s.tip : sonuc.tip,
        aidiyet: s.aidiyet,
        sifat: s.sifat,
      };
    });
  await prisma.$transaction([
    prisma.musteriTelefonu.deleteMany({ where: { musteriId } }),
    prisma.musteriTelefonu.createMany({ data: satirlar }),
  ]);
}

export async function musteriOlustur(formData: FormData) {
  const adSoyadUnvan = buyukHarfeCevir(String(formData.get("adSoyadUnvan") ?? "").trim());
  const tipId = String(formData.get("tipId") ?? "");
  const durumId = String(formData.get("durumId") ?? "");

  if (!adSoyadUnvan || !tipId || !durumId) {
    throw new Error("Ad/Soyad/Unvan, tip ve durum alanları zorunludur.");
  }

  const kisaUnvan = await kisaUnvanDurumu(adSoyadUnvan, tipId, formData);
  const eksikler = eksikBilgiler(formData);
  const musteri = await prisma.musteri.create({
    data: {
      adSoyadUnvan,
      tipId,
      durumId,
      telefon: metinYaAlNull(formData, "telefon"),
      eposta: metinYaAlNull(formData, "eposta"),
      adres: metinYaAlNull(formData, "adres"),
      il: metinYaAlNull(formData, "il"),
      ilce: metinYaAlNull(formData, "ilce"),
      sorumluAvukatId: metinYaAlNull(formData, "sorumluAvukatId"),
      notlar: metinYaAlNull(formData, "notlar"),
    },
  });
  await adresListeKontrolu(formData, adSoyadUnvan);

  if (kisaUnvan) {
    const kullanici = await mevcutKullanici();
    await unvanGoreviOlustur({ ad: adSoyadUnvan, tur: "Müvekkil", kayitId: musteri.id, kullaniciId: kullanici?.kullaniciId ?? null });
  }
  if (eksikler.length > 0) {
    const kullanici = await mevcutKullanici();
    await eksikBilgiGoreviOlustur({ ad: adSoyadUnvan, eksikler, kayitId: musteri.id, kullaniciId: kullanici?.kullaniciId ?? null });
  }
  await telefonSatirlariniYaz(musteri.id, formData);
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

  const kisaUnvan = await kisaUnvanDurumu(adSoyadUnvan, tipId, formData);
  const eksikler = eksikBilgiler(formData);
  await prisma.musteri.update({
    where: { id },
    data: {
      adSoyadUnvan,
      tipId,
      durumId,
      telefon: metinYaAlNull(formData, "telefon"),
      eposta: metinYaAlNull(formData, "eposta"),
      adres: metinYaAlNull(formData, "adres"),
      il: metinYaAlNull(formData, "il"),
      ilce: metinYaAlNull(formData, "ilce"),
      sorumluAvukatId: metinYaAlNull(formData, "sorumluAvukatId"),
      notlar: metinYaAlNull(formData, "notlar"),
    },
  });
  await adresListeKontrolu(formData, adSoyadUnvan);

  if (kisaUnvan) {
    const kullanici = await mevcutKullanici();
    await unvanGoreviOlustur({ ad: adSoyadUnvan, tur: "Müvekkil", kayitId: id, kullaniciId: kullanici?.kullaniciId ?? null });
  } else {
    await unvanGoreviniKapat(id);
  }
  if (formData.has("tel_no")) {
    if (eksikler.length > 0) {
      const kullanici = await mevcutKullanici();
      await eksikBilgiGoreviOlustur({ ad: adSoyadUnvan, eksikler, kayitId: id, kullaniciId: kullanici?.kullaniciId ?? null });
    } else {
      await eksikBilgiGoreviniKapat(id);
    }
  }
  await telefonSatirlariniYaz(id, formData);
  revalidatePath("/kokpit/musteriler");
  revalidatePath(`/kokpit/musteriler/${id}`);
  redirect(`/kokpit/musteriler/${id}`);
}

// "Paneli düzenle" ile müvekkil detayındaki karttan yapılan tekil alan
// güncellemeleri (yalnızca izin verilen alanlar).
const MUSTERI_DUZENLENEBILIR_ALANLAR = ["telefon", "eposta", "adres", "sorumluAvukatId", "notlar"];

export async function musteriAlanlariniGuncelle(id: string, degerler: Record<string, string>) {
  const kullanici = await mevcutKullanici();
  if (!kullanici) throw new Error("Bu işlem için yetkiniz yok.");

  const data: Record<string, string | null> = {};
  for (const [alan, ham] of Object.entries(degerler)) {
    if (!MUSTERI_DUZENLENEBILIR_ALANLAR.includes(alan)) throw new Error("Bu alan buradan değiştirilemez.");
    data[alan] = ham.trim() === "" ? null : ham.trim();
  }

  await prisma.musteri.update({ where: { id }, data });
  revalidatePath("/kokpit/musteriler");
  revalidatePath(`/kokpit/musteriler/${id}`);
}

export async function musteriSil(id: string, sifre?: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  await silmeSifresiniDogrula(sifre);

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

export async function paraTrafigiKaydiSil(musteriId: string, kayitId: string, sifre?: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  await silmeSifresiniDogrula(sifre);

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

export async function irtibatKisisiSil(musteriId: string, kisiId: string, sifre?: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  await silmeSifresiniDogrula(sifre);

  await prisma.irtibatKisisi.delete({ where: { id: kisiId } });
  revalidatePath(`/kokpit/musteriler/${musteriId}`);
}

// "Yeni Dosya" gibi formlardan, sayfadan ayrilmadan hizlica muvekkil eklemek icin (yonlendirme YAPMAZ).
// Eksik bilgiler sonradan Muvekkiller bolumunden tamamlanir.
export async function hizliMusteriSecenekleri(): Promise<{ tipler: { id: string; etiket: string; tuzel: boolean }[] }> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) throw new Error("Oturum bulunamadı.");
  const tipler = await secenekleriGetir("musteri_tipi");
  return { tipler: tipler.map((t) => ({ id: t.id, etiket: t.etiket, tuzel: t.kod === "tuzel_kisi" })) };
}

export async function hizliMusteriOlustur(girdi: {
  ad: string;
  tipId: string;
  telefon: string;
  kisaOnay: boolean;
  eksikOnay?: boolean;
}): Promise<{ hata?: string; id?: string; ad?: string }> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) return { hata: "Oturum bulunamadı." };
  const ad = buyukHarfeCevir(girdi.ad.trim());
  if (!ad || !girdi.tipId) return { hata: "Ad / ünvan ve tip zorunludur." };
  const tip = await prisma.secenekDegeri.findUnique({ where: { id: girdi.tipId }, select: { kod: true } });
  const kisa = unvanKisaMi(ad, tip?.kod === "tuzel_kisi");
  if (kisa && !girdi.kisaOnay) return { hata: KISA_UNVAN_UYARISI };

  const durumlar = await secenekleriGetir("musteri_durumu");
  const durum = durumlar.find((d) => /aktif/i.test(d.kod) || /aktif/i.test(d.etiket)) ?? durumlar[0];
  if (!durum) return { hata: "Müvekkil durumu listesi boş; önce Ayarlar > Seçenek Listeleri'nden ekleyin." };

  let telefonSatiri: { telefon: string; tip: "CEP" | "SABIT" | null } | null = null;
  if (girdi.telefon.trim()) {
    const sonuc = telefonuDuzenle(girdi.telefon.trim(), "");
    if ("hata" in sonuc) return { hata: `Telefon: ${sonuc.hata}` };
    telefonSatiri = { telefon: sonuc.deger, tip: sonuc.tip };
  }

  // Hizli formda adres sorulmaz: adres her zaman gorevle takip edilir; telefon bossa ayrica onay gerekir.
  const eksikler = telefonSatiri ? ["Adres"] : ["Telefon", "Adres"];
  if (!telefonSatiri && !girdi.eksikOnay) return { hata: eksikBilgiUyarisi(["Telefon"]) };

  const musteri = await prisma.musteri.create({ data: { adSoyadUnvan: ad, tipId: girdi.tipId, durumId: durum.id } });
  await eksikBilgiGoreviOlustur({ ad, eksikler, kayitId: musteri.id, kullaniciId: kullanici.kullaniciId });
  if (telefonSatiri) {
    await prisma.musteriTelefonu.create({ data: { musteriId: musteri.id, siraNo: 0, telefon: telefonSatiri.telefon, telefonTipi: telefonSatiri.tip } });
  }
  if (kisa) await unvanGoreviOlustur({ ad, tur: "Müvekkil", kayitId: musteri.id, kullaniciId: kullanici.kullaniciId });
  revalidatePath("/kokpit/musteriler");
  return { id: musteri.id, ad };
}
