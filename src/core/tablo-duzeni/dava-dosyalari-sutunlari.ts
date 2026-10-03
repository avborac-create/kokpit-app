// Dosyalar tablosunun admin tarafindan siralanabilir/gizlenebilir sutun
// kumesi icin tek dogru kaynak - hem admin ekrani (etiketler) hem de
// tablonun kendisi (sirali/gorunur sutunlari okumak icin) burayi kullanir.
// "İşlemler" (Düzenle/Sil) bir veri sutunu degil, islevsel bir sutundur -
// bu kumeye dahil edilmez, tabloda her zaman en sonda sabit kalir.
export const DAVA_DOSYALARI_SUTUN_ETIKETLERI: Record<string, string> = {
  kayitNo: "Kokpit No",
  buroNo: "BN",
  dosyaNo: "Dosya No",
  tur: "Tür / Konu",
  birimAdi: "Birim",
  karsiTaraflar: "Karşı Taraf",
  muvekkiller: "Müvekkil",
  durum: "Durum",
  sorumluAvukat: "Sorumlu Avukat",
};

// Kisaltilmis etiketlerin imlec uzerine gelince gosterilen tam adi.
export const DAVA_DOSYALARI_SUTUN_ACIKLAMALARI: Record<string, string> = {
  buroNo: "OBJEKT BÜRO NO",
  tur: "Tür (Dava › Hukuk, İcra…) · Konu (Çek, Bono…)",
};

export const DAVA_DOSYALARI_VARSAYILAN_SUTUN_SIRASI = Object.keys(DAVA_DOSYALARI_SUTUN_ETIKETLERI);

// Kokpit No, satırın dosya detayına giden tek linki - gizlenemez, sadece
// sırası değişebilir.
export const DAVA_DOSYALARI_GIZLENEMEZ_SUTUNLAR = ["kayitNo"];
