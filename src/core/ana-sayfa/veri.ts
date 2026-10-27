// Ana sayfa icin dis veri kaynaklari. Hicbiri zorunlu degildir: kaynak
// yanit vermezse null doner ve ilgili panel sessizce gizlenir.

const ZAMAN_ASIMI_MS = 5000;

async function metinGetir(url: string, saniye: number): Promise<string | null> {
  try {
    const yanit = await fetch(url, {
      next: { revalidate: saniye },
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      headers: { "User-Agent": "Mozilla/5.0 (Kokpit)" },
    });
    if (!yanit.ok) return null;
    return await yanit.text();
  } catch {
    return null;
  }
}

export type Kur = { kod: string; ad: string; alis: number; satis: number };
export type KurOzeti = { tarih: string; kurlar: Kur[] };

// TCMB gunluk gosterge kurlari (today.xml). Hafta sonu / tatilde son is gunu gosterilir.
export async function dovizKurlari(): Promise<KurOzeti | null> {
  const xml = await metinGetir("https://www.tcmb.gov.tr/kurlar/today.xml", 1800);
  if (!xml) return null;
  const tarih = xml.match(/Tarih="([^"]+)"/)?.[1] ?? "";
  const kurlar: Kur[] = [];
  for (const [kod, ad] of [
    ["USD", "ABD Doları"],
    ["EUR", "Euro"],
    ["GBP", "İngiliz Sterlini"],
  ] as const) {
    const blok = xml.match(new RegExp(`<Currency[^>]*Kod="${kod}"[\\s\\S]*?</Currency>`))?.[0];
    const alis = Number(blok?.match(/<ForexBuying>([\d.]+)</)?.[1]);
    const satis = Number(blok?.match(/<ForexSelling>([\d.]+)</)?.[1]);
    if (Number.isFinite(alis) && Number.isFinite(satis)) kurlar.push({ kod, ad, alis, satis });
  }
  return kurlar.length > 0 ? { tarih, kurlar } : null;
}

export type Haber = { baslik: string; baglanti: string; tarih: Date | null };

const VARLIKLAR: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " " };
const varlikCoz = (s: string) => s.replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => VARLIKLAR[m] ?? m);
const sadeMetin = (s: string) => varlikCoz(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(/\s+/g, " ").trim();

// Hukuk haberleri (hukukihaber.net RSS). Baglanti haber sitesinin kendi sayfasina gider.
export async function hukukHaberleri(adet = 14): Promise<Haber[] | null> {
  const xml = await metinGetir("https://www.hukukihaber.net/rss", 900);
  if (!xml) return null;
  const haberler: Haber[] = [];
  for (const [, blok] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const baslik = sadeMetin(blok.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const baglanti = sadeMetin(blok.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
    const ham = blok.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
    const tarih = ham ? new Date(ham) : null;
    if (!baslik || !/^https:\/\//.test(baglanti)) continue;
    haberler.push({ baslik, baglanti, tarih: tarih && !Number.isNaN(tarih.getTime()) ? tarih : null });
    if (haberler.length >= adet) break;
  }
  return haberler.length > 0 ? haberler : null;
}
