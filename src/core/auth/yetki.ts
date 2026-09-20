import type { KullaniciRolu } from "@prisma/client";

// Ilk faz icin basit bir yetki modeli: goruntuleme/olusturma/duzenleme tum
// giris yapmis kullanicilara acik, silme islemleri sadece Yonetici ve Ortak
// rolune taninir. Ileride modul bazli/daha ayrintili bir yetki matrisine
// genisletilebilir (bu fonksiyonlarin imzasi degismeden ic mantik buyuyebilir).
const SILME_YETKISI_OLAN_ROLLER: KullaniciRolu[] = ["YONETICI", "ORTAK"];

export function silebilirMi(rol: KullaniciRolu): boolean {
  return SILME_YETKISI_OLAN_ROLLER.includes(rol);
}

// Geliştirme Kutusu gibi sadece sistem yöneticisine ait alanlar icin -
// silebilirMi'den (YONETICI+ORTAK) daha dar, yalnizca YONETICI.
export function sistemYoneticisiMi(rol: KullaniciRolu): boolean {
  return rol === "YONETICI";
}

// Haciz Raporu OLUSTURMA/YUKLEME - sahaya cikan haciz avukatlarina (bkz.
// ARCHITECTURE.md "Haciz Raporu") ve denetim/yedekleme amacli YONETICI/
// ORTAK'a acik. PERSONEL bu role dahil degil.
export function hacizAvukatiMi(rol: KullaniciRolu): boolean {
  return rol === "SORUMLU_AVUKAT" || rol === "YONETICI" || rol === "ORTAK";
}
