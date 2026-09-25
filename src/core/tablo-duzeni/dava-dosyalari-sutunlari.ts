// Dosyalar tablosunun admin tarafindan siralanabilir/gizlenebilir sutun
// kumesi icin tek dogru kaynak - hem admin ekrani (etiketler) hem de
// tablonun kendisi (sirali/gorunur sutunlari okumak icin) burayi kullanir.
// "İşlemler" (Düzenle/Sil) bir veri sutunu degil, islevsel bir sutundur -
// bu kumeye dahil edilmez, tabloda her zaman en sonda sabit kalir.
export const DAVA_DOSYALARI_SUTUN_ETIKETLERI: Record<string, string> = {
  kayitNo: "Kokpit No",
  dosyaNo: "Dosya No",
  tur: "Tür",
  birimAdi: "Birim",
  konu: "Konu",
  karsiTaraflar: "Karşı Taraf",
  muvekkiller: "Müvekkil",
  durum: "Durum",
  sorumluAvukat: "Sorumlu Avukat",
};

export const DAVA_DOSYALARI_VARSAYILAN_SUTUN_SIRASI = Object.keys(DAVA_DOSYALARI_SUTUN_ETIKETLERI);

// Kokpit No, satırın dosya detayına giden tek linki - gizlenemez, sadece
// sırası değişebilir.
export const DAVA_DOSYALARI_GIZLENEMEZ_SUTUNLAR = ["kayitNo"];
