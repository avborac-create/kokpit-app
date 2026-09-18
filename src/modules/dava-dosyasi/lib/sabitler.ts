import type { DosyaEvresi, HukukiMudahaleDurumu } from "@prisma/client";

// Dava Dosyasi Yasam Dongusu (Avukat Sapkasi + Karar Sonrasi Takip) -
// bkz. ARCHITECTURE.md. dosyaEvresi/HukukiMudahaleDurumu native enum
// oldugundan (kapali/sabit is akisi, otomasyon bu degerler uzerinde
// dallanir) etiketleri burada, tek yerde tutuyoruz.

export const DOSYA_EVRESI_ETIKETLERI: Record<DosyaEvresi, string> = {
  ACILIS: "Açılış",
  DERDEST: "Derdest",
  KARAR_VERILDI: "Karar Verildi",
  GEREKCELI_KARAR_BEKLENIYOR: "Gerekçeli Karar Bekleniyor",
  GEREKCELI_KARAR_HAZIR: "Gerekçeli Karar Hazır",
  TEBLIG_BEKLENIYOR: "Tebliğ Bekleniyor",
  KANUN_YOLU_DEGERLENDIRME: "Kanun Yolu Değerlendirmesi",
  ISTINAFTA: "İstinafta",
  BAM_KARARI_GELDI: "BAM Kararı Geldi",
  TEMYIZ_DEGERLENDIRME: "Temyiz Değerlendirmesi",
  TEMYIZDE: "Temyizde",
  KESINLESME_BEKLENIYOR: "Kesinleşme Bekleniyor",
  KESINLESTI: "Kesinleşti",
};

// Dosya detay sayfasindaki "Dosya Evresi" blogunda etiketin altinda
// gosterilen kisa aciklama - "dosya su an nerede?" sorusuna netlik katar.
export const DOSYA_EVRESI_ACIKLAMALARI: Record<DosyaEvresi, string> = {
  ACILIS: "Dosya yeni açıldı.",
  DERDEST: "Dava/icra süreci devam ediyor.",
  KARAR_VERILDI: "Mahkeme karar verdi.",
  GEREKCELI_KARAR_BEKLENIYOR: "Kararın gerekçesi henüz yazılmadı.",
  GEREKCELI_KARAR_HAZIR: "Gerekçeli karar hazır, incelenmeli.",
  TEBLIG_BEKLENIYOR: "Tebligat süreci bekleniyor.",
  KANUN_YOLU_DEGERLENDIRME: "İstinaf/temyiz yoluna gidilip gidilmeyeceği değerlendiriliyor.",
  ISTINAFTA: "Dosya BAM'da, istinaf kararı bekleniyor.",
  BAM_KARARI_GELDI: "BAM kararı geldi, incelenmeli.",
  TEMYIZ_DEGERLENDIRME: "Temyiz yoluna gidilip gidilmeyeceği değerlendiriliyor.",
  TEMYIZDE: "Dosya Yargıtay'da, temyiz kararı bekleniyor.",
  KESINLESME_BEKLENIYOR: "Kesinleşme süresi bekleniyor.",
  KESINLESTI: "Dosya hukuken kesinleşti (artçı işler ayrıca sürebilir).",
};

export const DOSYA_EVRELERI = Object.entries(DOSYA_EVRESI_ETIKETLERI).map(([deger, etiket]) => ({
  deger: deger as DosyaEvresi,
  etiket,
}));

export const HUKUKI_MUDAHALE_DURUMU_ETIKETLERI: Record<HukukiMudahaleDurumu, string> = {
  BEKLEMEDE: "Beklemede",
  DEVAM_EDIYOR: "Devam Ediyor",
  TAMAMLANDI: "Tamamlandı",
  IPTAL_EDILDI: "İptal Edildi",
};

export const HUKUKI_MUDAHALE_DURUMLARI = Object.entries(HUKUKI_MUDAHALE_DURUMU_ETIKETLERI).map(
  ([deger, etiket]) => ({ deger: deger as HukukiMudahaleDurumu, etiket }),
);

export const ACIK_HUKUKI_MUDAHALE_DURUMLARI: HukukiMudahaleDurumu[] = ["BEKLEMEDE", "DEVAM_EDIYOR"];

// Evre degistiginde Avukat Sapkasi'nda ÖNERİLECEK (otomatik olusturulmayacak)
// is - bkz. ARCHITECTURE.md "Otomasyon Mantigi". DB'de hicbir iz birakmaz;
// dava detay sayfasi render edilirken anlik hesaplanir (ayni turde/baslikta
// acik bir HukukiMudahale zaten varsa oneri gosterilmez).
export const EVRE_ONERI_HARITASI: Partial<Record<DosyaEvresi, { baslik: string; mudahaleTuruKodu: string }>> = {
  GEREKCELI_KARAR_HAZIR: { baslik: "Gerekçeli kararı incele", mudahaleTuruKodu: "hukuki_degerlendirme" },
  KANUN_YOLU_DEGERLENDIRME: {
    baslik: "İstinaf edilip edilmeyeceğini değerlendir",
    mudahaleTuruKodu: "kanun_yolu_stratejisi",
  },
  BAM_KARARI_GELDI: {
    baslik: "BAM kararını incele, temyiz değerlendirmesi yap",
    mudahaleTuruKodu: "hukuki_degerlendirme",
  },
  TEMYIZ_DEGERLENDIRME: {
    baslik: "Temyiz edilip edilmeyeceğini değerlendir",
    mudahaleTuruKodu: "kanun_yolu_stratejisi",
  },
};
