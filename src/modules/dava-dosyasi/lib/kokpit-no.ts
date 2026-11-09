type KokpitNoGirdisi = {
  kayitNo: number;
  altSiraNo?: number | null;
  anaDosya?: { kayitNo: number } | null;
};

function doldur(no: number) {
  return `KN-${no}`;
}

// Bagimsiz dosya "KN-19", alt dosya "KN-19a", "KN-19b" ... gosterilir (bkz.
// DavaDosyasi.anaDosyaId). Alt dosyanin kendi kayitNo'su DB'de tutulur ve
// ekranda gosterilmez; ana dosyadan ayrilinca eski numarasina doner.
export function altHarf(sira: number): string {
  return sira >= 1 && sira <= 26 ? String.fromCharCode(96 + sira) : `/${sira}`;
}

export function kokpitNoGoster(dosya: KokpitNoGirdisi): string {
  if (dosya.anaDosya && dosya.altSiraNo) return `${doldur(dosya.anaDosya.kayitNo)}${altHarf(dosya.altSiraNo)}`;
  return doldur(dosya.kayitNo);
}

export function kayitNoGoster(kayitNo: number): string {
  return doldur(kayitNo);
}

// Buro numarasi ekranlarda "BN-8655" olarak gosterilir (OBJEKT BÜRO NO). DB'de
// ve formda ham deger (8655) tutulur; "YOK" gibi sayisal olmayan degerler
// oneksiz birakilir.
export function buroNoGoster(buroNo: string | null | undefined): string {
  // "YOK" (büro numarası yok) boş değerle aynı görünür: çizgi.
  if (!buroNo || buroNo.trim().toLocaleUpperCase("tr-TR") === "YOK") return "—";
  return /^\d/.test(buroNo) ? `BN-${buroNo}` : buroNo;
}

// Finans/secim ekranlarinda bir dosyayi kisaca anan etiket: buro no varsa
// "BN-8655", yoksa Kokpit No ("KN-19" ya da alt dosya icin "KN-19/1").
export function dosyaKisaNo(dosya: KokpitNoGirdisi & { buroNo?: string | null }): string {
  return dosya.buroNo ? buroNoGoster(dosya.buroNo) : kokpitNoGoster(dosya);
}
