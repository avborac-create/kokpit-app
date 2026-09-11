import type { KullaniciRolu } from "@prisma/client";

// Ilk faz icin basit bir yetki modeli: goruntuleme/olusturma/duzenleme tum
// giris yapmis kullanicilara acik, silme islemleri sadece Yonetici ve Ortak
// rolune taninir. Ileride modul bazli/daha ayrintili bir yetki matrisine
// genisletilebilir (bu fonksiyonlarin imzasi degismeden ic mantik buyuyebilir).
const SILME_YETKISI_OLAN_ROLLER: KullaniciRolu[] = ["YONETICI", "ORTAK"];

export function silebilirMi(rol: KullaniciRolu): boolean {
  return SILME_YETKISI_OLAN_ROLLER.includes(rol);
}
