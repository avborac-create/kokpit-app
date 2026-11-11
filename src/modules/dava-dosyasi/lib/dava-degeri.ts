// Dava degeri = talep sonucundaki (netice ve talep) para kalemlerinin toplami.
// Talep maddeleri serbest metin oldugu icin yalniz tutar gibi gorunen sayilar
// okunur: yanindaki para birimi (TL / ₺ / USD / $ / EUR / € / GBP / £ ...) varsa
// o birimde, yoksa binlik ayiracli (1.000.000) sayilar TL kabul edilir. "%20",
// tarihler ve yillar sayilmaz. Toplam her para biriminde AYRI tutulur (kur
// donusumu yapilmaz).

export const PARA_BIRIMLERI = [
  { kod: "TRY", simge: "₺", ad: "TL" },
  { kod: "USD", simge: "$", ad: "USD" },
  { kod: "EUR", simge: "€", ad: "EUR" },
  { kod: "GBP", simge: "£", ad: "GBP" },
] as const;
export type ParaKodu = (typeof PARA_BIRIMLERI)[number]["kod"];
const paraGecerli = (v: unknown): v is ParaKodu => PARA_BIRIMLERI.some((p) => p.kod === v);

const SAYI = String.raw`(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?`;
const BIRIM = String.raw`(?:USD|euro|EUR|GBP|TRY|TL|₺|\$|€|£|avro|(?:amerikan\s+)?dolar[ıi]?|sterlin|lira)`;
const SONRAKI = new RegExp(String.raw`(?<![\d.,%])${SAYI}(?!\d)\s*(${BIRIM})`, "giu");
const ONCEKI = new RegExp(String.raw`(${BIRIM})\s*${SAYI}(?!\d)`, "giu");
const BIRIMSIZ = /(?<![\d.,%])(\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?(?![\d])/gu;
const DOVIZ = /USD|EUR|GBP|\$|€|£|dolar|avro|euro|sterlin/iu;

function kodaCevir(birim: string): ParaKodu {
  const b = birim.toLocaleLowerCase("tr-TR");
  if (b.includes("usd") || b === "$" || b.includes("dolar")) return "USD";
  if (b.includes("eur") || b === "€" || b.includes("avro")) return "EUR";
  if (b.includes("gbp") || b === "£" || b.includes("sterlin")) return "GBP";
  return "TRY";
}
const sayiDegeri = (tam: string, kurus?: string) => Number(tam.replace(/\./g, "")) + (kurus ? Number(`0.${kurus.padEnd(2, "0")}`) : 0);

// Bir madde metnindeki tutarlar (para birimine gore).
function maddeTutarlari(madde: string): Map<ParaKodu, number> {
  const harita = new Map<ParaKodu, number>();
  const ekle = (k: ParaKodu, t: number) => harita.set(k, (harita.get(k) ?? 0) + t);
  const kullanilan: [number, number][] = [];
  for (const m of madde.matchAll(SONRAKI)) {
    const b = m.index ?? 0;
    if (madde.charAt(b + m[0].length) === "%") continue;
    ekle(kodaCevir(m[3]), sayiDegeri(m[1], m[2]));
    kullanilan.push([b, b + m[0].length]);
  }
  for (const m of madde.matchAll(ONCEKI)) {
    const b = m.index ?? 0;
    if (kullanilan.some(([x, y]) => b < y && b + m[0].length > x)) continue;
    ekle(kodaCevir(m[1]), sayiDegeri(m[2], m[3]));
  }
  if (harita.size === 0 && !DOVIZ.test(madde)) {
    for (const m of madde.matchAll(BIRIMSIZ)) {
      if (madde.charAt((m.index ?? 0) + m[0].length) === "%") continue;
      ekle("TRY", sayiDegeri(m[1], m[2]));
    }
  }
  return harita;
}

// Maddenin metninden okunan tutar ve para birimi (birden cok birim varsa ilki).
export function maddeTutari(madde: string): { tutar: number; para: ParaKodu } | null {
  const h = maddeTutarlari(madde);
  const ilk = h.entries().next();
  return ilk.done ? null : { para: ilk.value[0], tutar: ilk.value[1] };
}

const paraBicim = (tutar: number, para: string) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: paraGecerli(para) ? para : "TRY" }).format(tutar);

// Icra dosyasinda ayni alan "Takip Tutari / Takip Talebi" olarak gorunur (dava dosyasinda
// "Dava Degeri / Netice ve Talep"); dosya turune gore otomatik secilir.
export function degerEtiketleri(icraMi: boolean) {
  return icraMi
    ? { baslik: "Takip Tutarı (Takip Talebi)", form: "Takip Tutarı (Takip Talebi — ne kadar isteniyor?)", toplam: "Toplam takip tutarı", kpi: "Takip tutarı", kpiAlt: "takip talebi toplamı", kpiBos: "takip kalemi girilmedi", kalemKarti: "Takip Tutarı · Talep Kalemleri", yapistir: "Takip talebini buraya yapıştırın; maddelere kendiliğinden ayrılır" }
    : { baslik: "Dava Değeri (Netice ve Talep)", form: "Dava Değeri (Netice ve Talep — mahkemeden ne isteniyor?)", toplam: "Toplam dava değeri", kpi: "Dava değeri", kpiAlt: "talep toplamı", kpiBos: "talep kalemi girilmedi", kalemKarti: "Dava Değeri · Talep Kalemleri", yapistir: "Netice ve talebi buraya yapıştırın; maddelere kendiliğinden ayrılır" };
}

export function davaDegeriYaz(toplam: number, para: string = "TRY"): string {
  return paraBicim(toplam, para);
}

export type ParaToplamlari = Partial<Record<ParaKodu, number>>;

// "25.000,00 $ · 20.000,00 € · 516.000,00 ₺" (bos ise "").
export function toplamlariYaz(t: ParaToplamlari): string {
  return PARA_BIRIMLERI.flatMap((p) => ((t[p.kod] ?? 0) > 0 ? [paraBicim(t[p.kod] ?? 0, p.kod)] : [])).join(" · ");
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
  para: ParaKodu | ""; // bos = madde metninden okunan birim, o da yoksa TL
  kalem: string;
  tur: string;
  kismi: boolean;
  tamAlacak: number | null;
  artislar: TalepArtisi[];
};

export const bosEkstra = (): TalepEkstrasi => ({ tutar: null, para: "", kalem: "", tur: "", kismi: false, tamAlacak: null, artislar: [] });

const sayi = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.round(x * 100) / 100 : null);

export function ekstralariAyikla(ham: unknown): TalepEkstrasi[] {
  if (!Array.isArray(ham)) return [];
  return ham.slice(0, 100).map((e) => {
    const o = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
    const artislar = Array.isArray(o.artislar) ? o.artislar : [];
    return {
      tutar: sayi(o.tutar),
      para: paraGecerli(o.para) ? o.para : "",
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
export const ilkTalep = (metin: string, e: TalepEkstrasi) => e.tutar ?? maddeTutari(metin)?.tutar ?? 0;
export const paraBirimi = (metin: string, e: TalepEkstrasi): ParaKodu => e.para || maddeTutari(metin)?.para || "TRY";
export const artisToplami = (e: TalepEkstrasi) => e.artislar.reduce((t, a) => t + a.tutar, 0);
export const guncelTalep = (metin: string, e: TalepEkstrasi) => ilkTalep(metin, e) + artisToplami(e);

// Toplam dava degeri = her kalemin guncel talebi (ilk talep + artirim/islah), para birimine gore ayri.
export function davaDegeriToplamlari(maddeler: string[], ekstralar: TalepEkstrasi[]): ParaToplamlari {
  const t: ParaToplamlari = {};
  maddeler.forEach((m, i) => {
    const e = ekstralar[i] ?? bosEkstra();
    const g = guncelTalep(m, e);
    if (g > 0) t[paraBirimi(m, e)] = (t[paraBirimi(m, e)] ?? 0) + g;
  });
  return t;
}
