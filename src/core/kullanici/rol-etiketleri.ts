import type { BuroRolu, KullaniciRolu } from "@prisma/client";

// Uygulama rolu: yalniz Yonetici / Kullanici. Eski ORTAK ve SORUMLU_AVUKAT
// kayitlari da "Kullanici" gorunur (bkz. yetki.ts).
export type UygulamaRolu = "YONETICI" | "KULLANICI";

export const UYGULAMA_ROLU_ETIKETLERI: Record<UygulamaRolu, string> = {
  YONETICI: "Yönetici",
  KULLANICI: "Kullanıcı",
};

export function uygulamaRoluOf(rol: KullaniciRolu): UygulamaRolu {
  return rol === "YONETICI" ? "YONETICI" : "KULLANICI";
}

// Formdan gelen uygulama rolunu veritabani degerine cevirir. "Kullanici"
// yeni kayitlarda PERSONEL olarak saklanir (enum'u degistirmemek icin).
export function uygulamaRoluDbDegeri(rol: UygulamaRolu): KullaniciRolu {
  return rol === "YONETICI" ? "YONETICI" : "PERSONEL";
}

export const BURO_ROLU_ETIKETLERI: Record<BuroRolu, string> = {
  AVUKAT: "Avukat",
  YONETICI: "Yönetici",
  PERSONEL: "Personel",
};

export const BURO_ROLLERI: BuroRolu[] = ["AVUKAT", "YONETICI", "PERSONEL"];

export function buroRoluGecerliMi(deger: string): deger is BuroRolu {
  return (BURO_ROLLERI as string[]).includes(deger);
}
