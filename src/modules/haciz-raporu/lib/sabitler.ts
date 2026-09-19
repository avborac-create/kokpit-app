import type { BelgeTuru, HacizIslemDurumu, TeminatMuvafakatDurumu } from "@prisma/client";

// Sabit, kapali kumeler (bkz. schema.prisma'daki enum yorumlari - admin
// panelinden genisletilebilir olmalari istenmiyor, HukukiMudahaleDurumu ile
// ayni gerekce).
export const HACIZ_ISLEMI_DURUMU_ETIKETLERI: Record<HacizIslemDurumu, string> = {
  VAR: "Var",
  YOK: "Yok",
  KISMEN_VAR: "Kısmen Var",
  UYGULANMADI: "Uygulanmadı",
};

export const HACIZ_ISLEMI_DURUMLARI = Object.entries(HACIZ_ISLEMI_DURUMU_ETIKETLERI).map(
  ([deger, etiket]) => ({ deger: deger as HacizIslemDurumu, etiket }),
);

export const TEMINAT_MUVAFAKAT_ETIKETLERI: Record<TeminatMuvafakatDurumu, string> = {
  VAR: "Var",
  YOK: "Yok",
  ALINAMADI: "Alınamadı",
  IHTIYATI_ASAMASINDA_DEGIL: "İhtiyati Aşamasında Değil",
};

export const TEMINAT_MUVAFAKAT_DURUMLARI = Object.entries(TEMINAT_MUVAFAKAT_ETIKETLERI).map(
  ([deger, etiket]) => ({ deger: deger as TeminatMuvafakatDurumu, etiket }),
);

// Indirilen ZIP'teki dosya adlari - bkz. zip.ts. Fotograflar haric her
// belge PDF olmak ZORUNDA (kullanicinin talebi); bu yuzden burada sabit.
export const BELGE_DOSYA_ADLARI: Record<BelgeTuru, string> = {
  HACIZ_TUTANAGI: "Haciz Tutanağı.pdf",
  PROTOKOL: "Protokol.pdf",
  FOTOGRAF: "Fotoğraf", // sıra numarası + orijinal uzantı zip.ts'de eklenir
};

// Haciz Raporu.pdf, yuklenen bir Belge DEGIL - her indirmede form
// verisinden taze uretilir (bkz. pdf.tsx), bu yuzden BELGE_DOSYA_ADLARI'nda
// yer almaz.
export const HACIZ_RAPORU_PDF_ADI = "Haciz Raporu.pdf";
