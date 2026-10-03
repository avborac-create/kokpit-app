type KokpitNoGirdisi = {
  kayitNo: number;
  altSiraNo?: number | null;
  anaDosya?: { kayitNo: number } | null;
};

function doldur(no: number) {
  return `KP-${String(no).padStart(4, "0")}`;
}

// Bagimsiz dosya "KP-0019", alt dosya "KP-0019/1" gosterilir (bkz.
// DavaDosyasi.anaDosyaId). Alt dosyanin kendi kayitNo'su DB'de ve aramada
// korunur; ana dosyadan ayrilinca eski numarasina doner.
export function kokpitNoGoster(dosya: KokpitNoGirdisi): string {
  if (dosya.anaDosya && dosya.altSiraNo) return `${doldur(dosya.anaDosya.kayitNo)}/${dosya.altSiraNo}`;
  return doldur(dosya.kayitNo);
}

export function kayitNoGoster(kayitNo: number): string {
  return doldur(kayitNo);
}

// Buro numarasi ekranlarda "BN-8655" olarak gosterilir (OBJEKT BÜRO NO). DB'de
// ve formda ham deger (8655) tutulur; "YOK" gibi sayisal olmayan degerler
// oneksiz birakilir.
export function buroNoGoster(buroNo: string | null | undefined): string {
  if (!buroNo) return "—";
  return /^\d/.test(buroNo) ? `BN-${buroNo}` : buroNo;
}

// Finans/secim ekranlarinda bir dosyayi kisaca anan etiket: buro no varsa
// "BN-8655", yoksa Kokpit No ("KP-0019" ya da alt dosya icin "KP-0019/1").
export function dosyaKisaNo(dosya: KokpitNoGirdisi & { buroNo?: string | null }): string {
  return dosya.buroNo ? buroNoGoster(dosya.buroNo) : kokpitNoGoster(dosya);
}
