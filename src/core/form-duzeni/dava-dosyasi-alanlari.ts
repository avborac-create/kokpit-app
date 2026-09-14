// Dava Dosyasi formunun admin tarafindan siralanabilir/gizlenebilir alan
// kumesi icin tek dogru kaynak - hem admin ekrani (etiketler) hem server
// action (hangi alanlar hic gizlenemez) hem de formun kendisi (savunma
// amacli: gizlenemez alanlar icin gizli=false zorlanir) burayi kullanir.
export const DAVA_DOSYASI_ALAN_ETIKETLERI: Record<string, string> = {
  hukukiIliskiTuruId: "Hukuki İlişki Türü",
  turId: "Dosya Türü",
  dosyaNo: "Dosya No",
  konu: "Konu",
  durumId: "Durum",
  birimAdi: "Birim Adı (Mahkeme/İcra Dairesi)",
  uyusmazlikGrubuId: "Uyuşmazlık Grubu",
  bagliOlduguDosyaId: "Bağlı Olduğu Esas Dosya",
  acilisTarihi: "Açılış Tarihi",
  kapanisTarihi: "Kapanış Tarihi",
  sorumluAvukatId: "Sorumlu Avukat",
  aciklama: "Açıklama",
};

// Bunlar DB'de zorunlu VE davaDosyasiOlustur/Guncelle server action'i
// tarafindan ek olarak dogrulanan alanlar - admin panelinde asla
// "Gizli" yapilamaz, sadece sirasi degisebilir.
export const DAVA_DOSYASI_GIZLENEMEZ_ALANLAR = ["turId", "konu", "durumId", "acilisTarihi"];
