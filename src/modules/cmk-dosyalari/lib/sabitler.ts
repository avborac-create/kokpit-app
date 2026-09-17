import type { CMKDosyaDurumu } from "@prisma/client";

// Sabit, kapali kume (bkz. schema.prisma'daki enum yorumu - MusteriFinansHareketi
// ile ayni gerekce, admin panelinden genisletilebilir olmasi istenmiyor).
export const DOSYA_DURUMU_ETIKETLERI: Record<CMKDosyaDurumu, string> = {
  AKTIF: "Aktif",
  DURUSMASI_BEKLENIYOR: "Duruşması Bekleniyor",
  ISTINAF_BASVURUSU: "İstinaf Başvurusu",
  TEMYIZ: "Temyiz",
  DERDEST: "Derdest",
  KARAR_VERILDI: "Karar Verildi",
  KESINLESTI: "Kesinleşti",
  KAPANDI: "Kapandı",
};

export const CMK_DOSYA_DURUMLARI = Object.entries(DOSYA_DURUMU_ETIKETLERI).map(
  ([deger, etiket]) => ({ deger: deger as CMKDosyaDurumu, etiket }),
);
