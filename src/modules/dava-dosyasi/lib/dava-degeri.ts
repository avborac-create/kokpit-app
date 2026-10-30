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

// ---- Talep kalemleri (kalem / tur / kismi dava / artirim-islah) ----
// Madde metinleri talepSonucu'nda durur; her maddenin ek bilgisi ayni sirada
// `talepKalemleri` JSON dizisinde tutulur.
export const KALEM_ONERILERI = [
  "Asıl alacak", "Cezai şart", "Yoksun kalınan kâr", "Kıdem tazminatı", "İhbar tazminatı", "Maddi tazminat",
  "Manevi tazminat", "Ücret alacağı", "Fazla mesai", "İşlemiş faiz", "Vekâlet ücreti", "Yargılama gideri",
];
export const KALEM_TURLERI = ["Asıl alacak", "Tazminat", "Faiz", "Yargılama gideri / vekâlet ücreti", "Tespit / diğer"];
export const ARTIS_TURLERI = ["Islah", "Talep artırımı"] as const;

export type TalepArtisi = { tarih: string; tur: (typeof ARTIS_TURLERI)[number]; tutar: number };
export type TalepEkstrasi = {
  tutar: number | null;
  kalem: string;
  tur: string;
  kismi: boolean;
  tamAlacak: number | null;
  artislar: TalepArtisi[];
};

export const bosEkstra = (): TalepEkstrasi => ({ tutar: null, kalem: "", tur: "", kismi: false, tamAlacak: null, artislar: [] });

const sayi = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.round(x * 100) / 100 : null);

export function ekstralariAyikla(ham: unknown): TalepEkstrasi[] {
  if (!Array.isArray(ham)) return [];
  return ham.slice(0, 100).map((e) => {
    const o = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
    const artislar = Array.isArray(o.artislar) ? o.artislar : [];
    return {
      tutar: sayi(o.tutar),
      kalem: typeof o.kalem === "string" ? o.kalem.trim().slice(0, 80) : "",
      tur: typeof o.tur === "string" ? o.tur.slice(0, 80) : "",
      kismi: o.kismi === true,
      tamAlacak: sayi(o.tamAlacak),
      artislar: artislar.slice(0, 50).flatMap((a) => {
        const x = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
        const t = sayi(x.tutar);
        const tur = ARTIS_TURLERI.find((v) => v === x.tur);
        return t !== null && tur && typeof x.tarih === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.tarih) ? [{ tarih: x.tarih, tur, tutar: t }] : [];
      }),
    };
  });
}

// Bir kalemin ilk talebi: girilen tutar, yoksa madde metninden okunan tutar.
export const ilkTalep = (metin: string, e: TalepEkstrasi) => e.tutar ?? davaDegeriHesapla([metin]);
export const artisToplami = (e: TalepEkstrasi) => e.artislar.reduce((t, a) => t + a.tutar, 0);
export const guncelTalep = (metin: string, e: TalepEkstrasi) => ilkTalep(metin, e) + artisToplami(e);

// Toplam dava degeri = her kalemin guncel talebi (ilk talep + artirim/islah).
export function davaDegeriKalemlerden(maddeler: string[], ekstralar: TalepEkstrasi[]): number {
  return maddeler.reduce((t, m, i) => t + guncelTalep(m, ekstralar[i] ?? bosEkstra()), 0);
}
