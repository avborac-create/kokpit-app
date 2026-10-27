"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { sifreDogrula } from "./password";
import {
  GORUNUM_COOKIE_ADI,
  GORUNUM_COOKIE_OMRU_SN,
  gorunumuBirlestir,
  gorunumuCozumle,
} from "@/core/gorunum/sabitler";
import { OTURUM_COOKIE_ADI, OTURUM_COOKIE_SECENEKLERI, oturumTokeniOlustur } from "./session";

export type GirisSonucu = { hata: string } | undefined;

export async function girisYap(
  _oncekiDurum: GirisSonucu,
  formData: FormData,
): Promise<GirisSonucu> {
  const eposta = String(formData.get("eposta") ?? "").trim().toLowerCase();
  const sifre = String(formData.get("sifre") ?? "");

  if (!eposta || !sifre) {
    return { hata: "E-posta ve şifre gereklidir." };
  }

  const kullanici = await prisma.kullanici.findUnique({ where: { eposta } });
  if (!kullanici || !kullanici.aktifMi) {
    return { hata: "E-posta veya şifre hatalı." };
  }

  const dogruMu = await sifreDogrula(sifre, kullanici.sifreHash);
  if (!dogruMu) {
    return { hata: "E-posta veya şifre hatalı." };
  }

  const token = await oturumTokeniOlustur({
    kullaniciId: kullanici.id,
    adSoyad: kullanici.adSoyad,
    eposta: kullanici.eposta,
    rol: kullanici.rol,
  });

  const cookieStore = await cookies();
  cookieStore.set(OTURUM_COOKIE_ADI, token, OTURUM_COOKIE_SECENEKLERI);

  // Kullanicinin hesabinda kayitli gorunum tercihi varsa bu cihaza tasinir
  // (yeni bilgisayarda da ayni tema/palet/cam gelsin).
  if (kullanici.gorunumTema || kullanici.gorunumCam || kullanici.gorunumPalet || kullanici.gorunumPunto) {
    cookieStore.set(
      GORUNUM_COOKIE_ADI,
      gorunumuBirlestir(
        gorunumuCozumle(`${kullanici.gorunumTema}.${kullanici.gorunumCam}.${kullanici.gorunumPalet}.${kullanici.gorunumPunto}`),
      ),
      { path: "/", maxAge: GORUNUM_COOKIE_OMRU_SN, sameSite: "lax" },
    );
  }

  redirect("/kokpit");
}

export async function cikisYap() {
  const cookieStore = await cookies();
  cookieStore.delete(OTURUM_COOKIE_ADI);
  redirect("/giris");
}
