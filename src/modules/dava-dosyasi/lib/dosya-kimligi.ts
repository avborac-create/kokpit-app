// Dosya kimligi: Birim ("İstanbul 1. İş Mahkemesi") + Dosya No ("2026/1 Esas").
// Hem form (istemci) hem sunucu ayni kurali kullanir; dosya no tek metin
// olarak saklanir ("2026/1 Esas") - sema degismez, eski kayitlar bozulmaz.

export const DOSYA_NO_TURLERI = ["Esas", "Talimat", "Değişik İş", "Soruşturma", "İhbar"] as const;

export const EN_ESKI_DOSYA_YILI = 1980;

export function enGecDosyaYili(): number {
  return new Date().getFullYear() + 1;
}

export function dosyaNoAyristir(deger: string | null | undefined): { yil: string; sira: string; tur: string } | null {
  const m = /^(\d{4})\s*\/\s*(\d+)\s*(.*)$/.exec((deger ?? "").trim());
  return m ? { yil: m[1], sira: m[2], tur: m[3].trim() } : null;
}

export function dosyaNoBirlestir(yil: string, sira: string, tur: string): string {
  return `${yil}/${sira}${tur ? ` ${tur}` : ""}`;
}

// Birim alanina yanlislikla dosya numarasi yazilmis mi (ör. "2026/423", "İstanbul 51. Asliye 2026")?
export function birimDosyaNosuGibiMi(birim: string): boolean {
  return /\d+\s*\/\s*\d+/.test(birim) || /\b(19|20)\d{2}\b/.test(birim);
}

export const BIRIM_HATASI =
  "Birim adına dosya numarası yazılmış gibi görünüyor. Birim yalnız mahkeme/daire adıdır (ör. İstanbul 1. İş Mahkemesi); numarayı Dosya No alanına girin.";

export function yilHatasi(yil: string): string | null {
  if (!/^\d{4}$/.test(yil)) return "Yıl 4 haneli olmalı (ör. 2026 — 26 değil).";
  const sayi = Number(yil);
  if (sayi < EN_ESKI_DOSYA_YILI || sayi > enGecDosyaYili()) {
    return `Yıl ${EN_ESKI_DOSYA_YILI} ile ${enGecDosyaYili()} arasında olmalı.`;
  }
  return null;
}

export const DOSYA_NO_BICIM_HATASI =
  "Dosya numarası YIL/SIRA biçiminde olmalı ve yıl 4 haneli olmalı (ör. 2026/423 Esas).";

// Sunucu tarafi dogrulama. Degismemis eski degerler (mevcut*) kontrol
// edilmez - bicimi eski olan dosyalar baska bir alan duzenlenirken
// kaydedilemez hale gelmesin.
export function dosyaKimligiHatasi(
  birim: string | null,
  dosyaNo: string | null,
  mevcut?: { birimAdi: string | null; dosyaNo: string | null },
): string | null {
  if (birim && birim !== mevcut?.birimAdi && birimDosyaNosuGibiMi(birim)) return BIRIM_HATASI;
  if (dosyaNo && dosyaNo !== mevcut?.dosyaNo) {
    const ayri = dosyaNoAyristir(dosyaNo);
    if (!ayri) return DOSYA_NO_BICIM_HATASI;
    const yil = yilHatasi(ayri.yil);
    if (yil) return yil;
  }
  return null;
}
