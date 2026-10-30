// Gorunum tercihleri: tema modu, renk paleti, cam efekti kademesi.
// Tercih cookie'de "tema.cam.palet" bicimindedir (orn. "sistem.orta.fume");
// cookie, JS tarafindan okunabilir olmalidir (httpOnly DEGIL) cunku ilk
// boyamadan ONCE <head> icindeki satir ici betik onu okuyup <html>'e
// data-tema / data-cam / data-palet niteliklerini yazar (bkz. Next.js
// "preventing-flash-before-hydration" rehberi). Kalici kayit Kullanici
// tablosundadir; cookie yalnizca hizli/yanip sonmeyen ilk boyama icindir.

export const TEMA_MODLARI = ["acik", "koyu", "sistem"] as const;
export const CAM_KADEMELERI = ["kapali", "hafif", "orta", "yogun"] as const;
export const PALETLER = ["bmw", "hiperekran", "gumus"] as const;
// Yazi boyutu: <html> yazi tabani (rem) olceklenir.
export const PUNTO_KADEMELERI = ["kucuk", "normal", "buyuk", "cokbuyuk"] as const;

export type TemaModu = (typeof TEMA_MODLARI)[number];
export type CamKademesi = (typeof CAM_KADEMELERI)[number];
export type Palet = (typeof PALETLER)[number];
export type PuntoKademesi = (typeof PUNTO_KADEMELERI)[number];

export type GorunumTercihi = { tema: TemaModu; cam: CamKademesi; palet: Palet; punto: PuntoKademesi };

export const VARSAYILAN_GORUNUM: GorunumTercihi = { tema: "sistem", cam: "orta", palet: "bmw", punto: "normal" };

export const GORUNUM_COOKIE_ADI = "kokpit_gorunum";
export const GORUNUM_COOKIE_OMRU_SN = 60 * 60 * 24 * 365;

export const TEMA_ETIKETLERI: Record<TemaModu, string> = {
  acik: "Açık",
  koyu: "Koyu",
  sistem: "Sistem",
};

export const PUNTO_ETIKETLERI: Record<PuntoKademesi, string> = {
  kucuk: "Küçük",
  normal: "Normal",
  buyuk: "Büyük",
  cokbuyuk: "Çok büyük",
};

export const CAM_ETIKETLERI: Record<CamKademesi, string> = {
  kapali: "Kapalı",
  hafif: "Hafif",
  orta: "Orta",
  yogun: "Yoğun",
};

// Paletin menüdeki önizleme renkleri: [açık mod zemini, koyu mod zemini, vurgu].
export const PALET_BILGISI: Record<Palet, { ad: string; renkler: [string, string, string] }> = {
  bmw: { ad: "BMW iDrive", renkler: ["#EEF2F8", "#1D2635", "#1C69D4"] },
  hiperekran: { ad: "Mercedes Hiperekran", renkler: ["#EAF1F6", "#1C2736", "#00ADEF"] },
  gumus: { ad: "Mercedes Gümüş", renkler: ["#EEF0F3", "#252B37", "#AAB4C2"] },
};

function listedeMi<T extends string>(liste: readonly T[], deger: unknown): deger is T {
  return typeof deger === "string" && (liste as readonly string[]).includes(deger);
}

export const temaModuMu = (d: unknown): d is TemaModu => listedeMi(TEMA_MODLARI, d);
export const camKademesiMi = (d: unknown): d is CamKademesi => listedeMi(CAM_KADEMELERI, d);
export const paletMi = (d: unknown): d is Palet => listedeMi(PALETLER, d);
export const puntoMu = (d: unknown): d is PuntoKademesi => listedeMi(PUNTO_KADEMELERI, d);

export function gorunumuCozumle(ham: string | null | undefined): GorunumTercihi {
  const [tema, cam, palet, punto] = (ham ?? "").split(".");
  return {
    tema: temaModuMu(tema) ? tema : VARSAYILAN_GORUNUM.tema,
    cam: camKademesiMi(cam) ? cam : VARSAYILAN_GORUNUM.cam,
    palet: paletMi(palet) ? palet : VARSAYILAN_GORUNUM.palet,
    punto: puntoMu(punto) ? punto : VARSAYILAN_GORUNUM.punto,
  };
}

export const gorunumuBirlestir = (t: GorunumTercihi) => `${t.tema}.${t.cam}.${t.palet}.${t.punto}`;

// "sistem" secildiyse isletim sisteminin acik/koyu ayarina bakilir.
export function etkinTema(tema: TemaModu, sistemAcikMi: boolean): "acik" | "koyu" {
  return tema === "sistem" ? (sistemAcikMi ? "acik" : "koyu") : tema;
}

// <head> icinde ilk boyamadan once calisan satir ici betik. Hata olursa
// (cookie/matchMedia yok) sunucunun yazdigi varsayilan nitelikler kalir.
export const GORUNUM_BASLATMA_BETIGI = `(function(){try{var m=document.cookie.match(/(?:^|; )${GORUNUM_COOKIE_ADI}=([^;]*)/);var p=m?decodeURIComponent(m[1]).split("."):[];var T=["acik","koyu","sistem"],C=["kapali","hafif","orta","yogun"],K=["bmw","hiperekran","gumus"],P=["kucuk","normal","buyuk","cokbuyuk"];var t=T.indexOf(p[0])>-1?p[0]:"sistem",c=C.indexOf(p[1])>-1?p[1]:"orta",k=K.indexOf(p[2])>-1?p[2]:"bmw",u=P.indexOf(p[3])>-1?p[3]:"normal";if(t==="sistem")t=matchMedia("(prefers-color-scheme: light)").matches?"acik":"koyu";var d=document.documentElement;d.setAttribute("data-tema",t);d.setAttribute("data-cam",c);d.setAttribute("data-palet",k);d.setAttribute("data-punto",u)}catch(e){}})()`;
