// Dava Dosyasi formunun admin tarafindan siralanabilir alan kumesi icin
// tek dogru kaynak - hem admin ekrani (etiketler) hem server action
// (hangi alanlar hic gizlenemez) hem de formun kendisi (savunma amacli:
// gizlenemez alanlar icin gizli=false zorlanir) burayi kullanir.
//
// NOT: Form, "gereğinden çok veri giriş kutusu var" geri bildirimi
// uzerine cekirdek 6 alana (+ Muvekkil/Karsi Taraf secicileri, bunlar
// ayri) indirildi - Dosya Turu/Durum/Dosya Kumesi/Acilis Tarihi/Konu
// artik formda hic gorunmuyor, actions.ts tarafinda otomatik dolduruluyor
// (bkz. dava-dosyasi/lib/actions.ts). Eski alanlar (turId, konu, durumId,
// uyusmazlikGrubuId, acilisTarihi, kapanisTarihi, sorumluAvukatId,
// aciklama, icraAltTuruId, yargiKoluId, bagliOlduguDosyaId) BILEREK bu
// listeden cikarildi - form-duzeni sayfasi bu listede olmayan eski DB
// kayitlarini otomatik gizler (bkz. form-duzeni/page.tsx).
export const DAVA_DOSYASI_ALAN_ETIKETLERI: Record<string, string> = {
  hukukiIliskiTuruId: "Uyuşmazlık Türü",
  davaTuruId: "Dava Türü",
  dosyaNo: "Dosya No",
  birimAdi: "Birim Adı (Mahkeme/İcra Dairesi)",
  talepSonucu: "Talep Sonucu",
  durusmaTarihi: "Duruşma Tarihi",
};

// Bunlar artik formun TAMAMI - sadelestirme sonrasi geriye kalanlarin
// hepsi cekirdek kabul edilip gizlenemez yapildi (sadece sirasi
// degisebilir). Dava Turu ayrica Konu'nun otomatik uretiminde
// kullanildigi icin (bkz. actions.ts) zorunlu tutuluyor.
export const DAVA_DOSYASI_GIZLENEMEZ_ALANLAR = Object.keys(DAVA_DOSYASI_ALAN_ETIKETLERI);
