import type { BuroRolu, KullaniciRolu } from "@prisma/client";

// Iki ayri rol vardir:
//  - Uygulama rolu (KullaniciRolu.rol): Yonetici / Kullanici. Sistem ayarlari,
//    kullanici yonetimi ve silme gibi islemleri belirler. YONETICI disindaki
//    her deger (PERSONEL, eski ORTAK/SORUMLU_AVUKAT) "Kullanici" sayilir.
//  - Buro rolu (BuroRolu): Avukat / Yonetici / Personel. Kisinin buro icindeki
//    gorevi; modul ve dosya ici menu erisimini kisitlamak icin (bkz.
//    modul-kayit-defteri.ts buroRolGorebilir). Kisitlama tanimlanmadikca
//    tum buro rolleri ayni yetkidedir.
export function silebilirMi(rol: KullaniciRolu): boolean {
  return rol === "YONETICI";
}

export function sistemYoneticisiMi(rol: KullaniciRolu): boolean {
  return rol === "YONETICI";
}

// Haciz Raporu OLUSTURMA/YUKLEME - sahaya cikan avukatlara ve sistem
// yoneticisine acik; buro rolu PERSONEL olan kullanici bu role dahil degil.
export function hacizAvukatiMi(rol: KullaniciRolu, buroRolu?: BuroRolu): boolean {
  return rol === "YONETICI" || buroRolu === "AVUKAT";
}
