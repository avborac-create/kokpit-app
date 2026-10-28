// Dava degeri = talep sonucundaki (netice ve talep) para kalemlerinin toplami.
// Talep maddeleri serbest metin oldugu icin yalniz tutar gibi gorunen
// sayilar toplanir: "TL / ₺ / lira" ile biten ya da binlik ayiracli (1.000.000)
// sayilar. "%20", tarihler, yillar ve doviz (USD/EUR) satirlari sayilmaz.

const TUTAR = /(?<![\d.,%])(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?(?![\d])(\s*(?:TL|₺|TRY|lira))?/giu;
const DOVIZ = /USD|EUR|GBP|\$|€|£|dolar|avro/iu;

export function davaDegeriHesapla(maddeler: string[]): number {
  let toplam = 0;
  for (const madde of maddeler) {
    if (DOVIZ.test(madde)) continue;
    for (const m of madde.matchAll(TUTAR)) {
      const baslangic = m.index ?? 0;
      const sonrasi = madde.charAt(baslangic + m[0].length);
      if (sonrasi === "%") continue;
      const binlikli = m[1].includes(".");
      if (!m[3] && !binlikli) continue;
      toplam += Number(m[1].replace(/\./g, "")) + (m[2] ? Number(`0.${m[2].padEnd(2, "0")}`) : 0);
    }
  }
  return toplam;
}

export function davaDegeriYaz(toplam: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(toplam);
}
