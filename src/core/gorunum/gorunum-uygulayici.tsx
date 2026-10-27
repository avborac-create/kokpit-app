"use client";

import { useLayoutEffect } from "react";
import {
  GORUNUM_COOKIE_ADI,
  GORUNUM_COOKIE_OMRU_SN,
  etkinTema,
  gorunumuBirlestir,
  gorunumuCozumle,
  type GorunumTercihi,
} from "./sabitler";

export function cookieGorunumunuOku(): GorunumTercihi {
  const eslesme = document.cookie.match(new RegExp(`(?:^|; )${GORUNUM_COOKIE_ADI}=([^;]*)`));
  return gorunumuCozumle(eslesme ? decodeURIComponent(eslesme[1]) : null);
}

export function gorunumuUygula(tercih: GorunumTercihi) {
  const sistemAcikMi = window.matchMedia("(prefers-color-scheme: light)").matches;
  const kok = document.documentElement;
  kok.setAttribute("data-tema", etkinTema(tercih.tema, sistemAcikMi));
  kok.setAttribute("data-cam", tercih.cam);
  kok.setAttribute("data-palet", tercih.palet);
  kok.setAttribute("data-punto", tercih.punto);
}

export function gorunumCookiesiniYaz(tercih: GorunumTercihi) {
  document.cookie = `${GORUNUM_COOKIE_ADI}=${encodeURIComponent(gorunumuBirlestir(tercih))}; path=/; max-age=${GORUNUM_COOKIE_OMRU_SN}; SameSite=Lax`;
}

// Ilk boyamayi <head> icindeki satir ici betik yapar. Bu bilesen iki is gorur:
// (1) gelistirme modunda React Strict Mode <html> niteliklerini sifirladiginda
// yeniden uygular, (2) tema "sistem" ise isletim sistemi ayari degisince
// (gece/gunduz gecisi) kendiliginden guncellenir.
export function GorunumUygulayici() {
  useLayoutEffect(() => {
    gorunumuUygula(cookieGorunumunuOku());

    const sorgu = window.matchMedia("(prefers-color-scheme: light)");
    const degisince = () => {
      const tercih = cookieGorunumunuOku();
      if (tercih.tema === "sistem") gorunumuUygula(tercih);
    };
    sorgu.addEventListener("change", degisince);
    return () => sorgu.removeEventListener("change", degisince);
  }, []);

  return null;
}
