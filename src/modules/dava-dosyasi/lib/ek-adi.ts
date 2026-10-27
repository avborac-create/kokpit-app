// Ek belge adini okunur hale getirir: "belge turu · dosya numarasi · tarih".
//   "2026_213_Tahsilat_Makbuzu_20_10_2026 (1).pdf" -> "Tahsilat Makbuzu · 2026/213 · 20.10.2026"
// Tarayicinin "(1)" kopya eki ve uzanti atilir; kalip tutmayan adlar yalnizca temizlenir.
export function ekGorunenAd(dosyaAdi: string): string {
  const taban = dosyaAdi
    .replace(/\.(pdf|png|jpe?g|webp|tiff?|html?|udf|docx)$/i, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .trim();
  const bosluk = (s: string) => s.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();

  const tam = taban.match(/^(\d{4})[_\s-](\d{1,7})[_\s-](.+?)[_\s-](\d{2})[_.-](\d{2})[_.-](\d{4})$/);
  if (tam) return `${bosluk(tam[3])} · ${tam[1]}/${tam[2]} · ${tam[4]}.${tam[5]}.${tam[6]}`;

  const dosyaNoIle = taban.match(/^(\d{4})[_\s-](\d{1,7})[_\s-](.+)$/);
  if (dosyaNoIle) return `${bosluk(dosyaNoIle[3])} · ${dosyaNoIle[1]}/${dosyaNoIle[2]}`;

  const tarihIle = taban.match(/^(.+?)[_\s-](\d{2})[_.-](\d{2})[_.-](\d{4})$/);
  if (tarihIle) return `${bosluk(tarihIle[1])} · ${tarihIle[2]}.${tarihIle[3]}.${tarihIle[4]}`;

  return bosluk(taban);
}
