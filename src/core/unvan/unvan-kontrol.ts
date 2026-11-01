// Tuzel kisi (firma) adlari ticaret sicilindeki TAM unvanla yazilmali ("KEMAL USTA OTO BAKIM
// ONARIM SANAYI TICARET LIMITED SIRKETI"), "Kemal Usta Oto" gibi kisa adla degil. Bu dosya
// hem formda (istemci) hem sunucuda ayni kurali uygular.

// Hukuki bicim / kurum eki: bunlardan biri varsa ad "tam unvan" sayilir.
const HUKUKI_BICIM =
  /(L[İI]M[İI]TED|LTD|ANON[İI]M|A\.?\s?Ş|KOLLEKT[İI]F|KOMAND[İI]T|KOOPERAT[İI]F|VAKF[İI]|DERNE[ĞG][İI]|BANKASI|BELED[İI]YES[İI]|BAŞKANLI[ĞG]I|MÜD[ÜU]RL[ÜU][ĞG][ÜU]|BAKANLI[ĞG]I|ÜN[İI]VERS[İI]TES[İI]|ŞUBES[İI]|ODASI|B[İI]RL[İI][ĞG][İI]|SEND[İI]KASI|HOLD[İI]NG)/;

// Kisi adinda gecmeyen, firma adinda sik gecen sozcukler.
const FIRMA_KELIMESI =
  /(^|\s)(OTO|OTOMOT[İI]V|OTOMOB[İI]L|[İI]NŞAAT|YAPI|T[İI]CARET|SANAY[İI]|GIDA|TEKST[İI]L|TUR[İI]ZM|NAKL[İI]YAT|LOJ[İI]ST[İI]K|MAK[İI]NA|PAZARLAMA|DANIŞMANLIK|YAZILIM|TEKNOLOJ[İI]|M[İI]MARLIK|MÜHEND[İI]SL[İI]K|[İI]THALAT|[İI]HRACAT|GRUP|MARKET|EMLAK|ELEKTR[İI]K|PLAST[İI]K|MOB[İI]LYA|KUYUMCULUK|MATBAA|REKLAM|ORGAN[İI]ZASYON|SERV[İI]S)(?=\s|$)/;

// tuzelMi: kayit "Tuzel Kisi" olarak isaretliyse yalniz hukuki bicim aranir.
export function unvanKisaMi(ad: string, tuzelMi = false): boolean {
  const u = ad.trim().toLocaleUpperCase("tr-TR");
  if (!u) return false;
  if (HUKUKI_BICIM.test(u)) return false;
  return tuzelMi || FIRMA_KELIMESI.test(u);
}

export const KISA_UNVAN_UYARISI =
  "Bu ad kısa görünüyor. Firmaların ticaret sicilindeki tam ünvanı (ör. “… Sanayi Ticaret Limited Şirketi”) yazılmalıdır; MERSİS ya da vekaletnameden alın.";

export const KISA_UNVAN_ONAY_METNI =
  "Kısa ünvan girdim; tam ünvanı MERSİS / Ticaret Sicil Gazetesi'nden sonra tamamlayacağım (yarın sabah bana görev açılsın)";
