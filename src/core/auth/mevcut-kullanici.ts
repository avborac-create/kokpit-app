import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/core/db/prisma";
import {
  ADINA_COOKIE_ADI,
  OTURUM_COOKIE_ADI,
  adinaTokeniDogrula,
  oturumTokeniDogrula,
  type OturumVerisi,
} from "./session";

// Giris yapmis GERCEK kisi (yonetici baska birinin gozuyle calissa bile yoneticinin kendisi).
export const gercekKullanici = cache(async (): Promise<OturumVerisi | null> => {
  const cookieStore = await cookies();
  return oturumTokeniDogrula(cookieStore.get(OTURUM_COOKIE_ADI)?.value);
});

// Server Component/Action agaci icinde ayni istek suresince tekrar tekrar
// cookie okuyup JWT dogrulamamak icin React `cache` ile sarmalanir.
// Yonetici "kullanici gozuyle calis" modundaysa, secilen kullanicinin oturumu doner
// (gercekKullanici alani yoneticiyi tasir); butun yetki/gorunum kontrolleri o kisiye gore isler.
export const mevcutKullanici = cache(async (): Promise<OturumVerisi | null> => {
  const gercek = await gercekKullanici();
  if (!gercek || gercek.rol !== "YONETICI") return gercek;
  const cookieStore = await cookies();
  const adina = cookieStore.get(ADINA_COOKIE_ADI)?.value;
  if (!adina) return gercek;
  const hedefId = await adinaTokeniDogrula(adina, gercek.kullaniciId);
  if (!hedefId || hedefId === gercek.kullaniciId) return gercek;
  const h = await prisma.kullanici.findUnique({
    where: { id: hedefId },
    select: { id: true, adSoyad: true, eposta: true, rol: true, buroRolu: true, aktifMi: true },
  });
  if (!h || !h.aktifMi) return gercek;
  return {
    kullaniciId: h.id,
    adSoyad: h.adSoyad,
    eposta: h.eposta,
    rol: h.rol,
    buroRolu: h.buroRolu,
    gercekKullanici: { kullaniciId: gercek.kullaniciId, adSoyad: gercek.adSoyad },
  };
});
