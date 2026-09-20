// Müvekkil formunun admin tarafindan siralanabilir/gizlenebilir alan
// kumesi icin tek dogru kaynak (bkz. dava-dosyasi-alanlari.ts - ayni
// ilke). Hem admin ekrani (etiketler) hem server action (hangi alanlar
// hic gizlenemez) hem de formun kendisi burayi kullanir.
export const MUSTERI_ALAN_ETIKETLERI: Record<string, string> = {
  adSoyadUnvan: "Ad Soyad / Unvan",
  tipId: "Tip",
  durumId: "Durum",
  telefon: "Telefon",
  eposta: "E-posta",
  adres: "Adres",
  sorumluAvukatId: "Sorumlu Avukat",
  notlar: "Notlar",
};

// Bunlar DB'de zorunlu VE musteriOlustur/Guncelle server action'i
// tarafindan ek olarak dogrulanan alanlar - admin panelinde asla
// "Gizli" yapilamaz, sadece sirasi degisebilir.
export const MUSTERI_GIZLENEMEZ_ALANLAR = ["adSoyadUnvan", "tipId", "durumId"];
