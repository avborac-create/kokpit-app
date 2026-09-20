import type { KullaniciRolu } from "@prisma/client";
import { sistemYoneticisiMi } from "@/core/auth/yetki";

export const ROL_ETIKETLERI: Record<KullaniciRolu, string> = {
  YONETICI: "Yönetici",
  ORTAK: "Ortak",
  SORUMLU_AVUKAT: "Sorumlu Avukat",
  PERSONEL: "Personel",
};

// YONETICI rolu sistem yoneticiligi anlamina geldigi icin (bkz. yetki.ts) -
// bir ORTAK'in yeni kullanici formundan baskasina YONETICI yetkisi
// verebilmesi bir yetki yukselmesi acigi olur. Bu yuzden atanabilir rol
// listesi, formu acan kisinin kendi roluyle sinirlanir: sadece mevcut bir
// YONETICI baska bir YONETICI olusturabilir.
export function atanabilirRoller(islemiYapaninRolu: KullaniciRolu): KullaniciRolu[] {
  const tumRoller: KullaniciRolu[] = ["YONETICI", "ORTAK", "SORUMLU_AVUKAT", "PERSONEL"];
  if (sistemYoneticisiMi(islemiYapaninRolu)) return tumRoller;
  return tumRoller.filter((rol) => rol !== "YONETICI");
}
