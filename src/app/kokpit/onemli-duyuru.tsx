import { hukukHaberleri, tbbHaberleri, type Haber } from "@/core/ana-sayfa/veri";

// Avukatlik ucreti, tarife, kanun/yonetmelik degisikligi, Anayasa Mahkemesi iptali gibi
// mesleki islerimizi dogrudan etkileyen haberler ana sayfanin en ustunde one cikarilir.
const ONEMLI = /aaüt|asgari ücret tarifesi|avukatlık (kanunu|ücret)|vekalet ücreti|vekâlet ücreti|iptal kar|anayasa mahkemesi.*(iptal|kanun)|(yasa|kanun|yönetmelik|tebliğ)\w* değişikli|kanunda değişiklik|kanun(la)? değiştiril|icra ve iflas|harçlar kanunu|hukuk muhakemeleri|ceza muhakemesi|ücret tarifesi|resmi gazete'de yayımlan|resmî gazete'de yayımlan/;

// Ayni haber farkli kaynaklarda (TBB, Hukuki Haber) tekrar geldiginde bir kez gosterilir:
// basliklar harf/rakam anahtar kelimelere indirgenir, ortak kelime orani yuksekse ayni sayilir.
function anahtarKelimeler(baslik: string): Set<string> {
  return new Set(
    baslik
      .toLocaleLowerCase("tr-TR")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((k) => k.length > 2),
  );
}
function benzerMi(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  let ortak = 0;
  for (const k of a) if (b.has(k)) ortak++;
  return ortak / Math.min(a.size, b.size) >= 0.6;
}

export type OnemliHaber = Haber & { kaynak: string };

// Hukuk Gundemi panelinin ustunde kucuk bir "Onemli degisiklik" listesi olarak gosterilir.
export async function onemliHaberleriGetir(adet = 3): Promise<OnemliHaber[]> {
  const [tbb, hukuki] = await Promise.all([tbbHaberleri(30), hukukHaberleri(30)]);
  const goruldu = new Set<string>();
  const liste: OnemliHaber[] = [];
  const kelimeler: Set<string>[] = [];
  for (const [kaynak, haberler] of [["TBB", tbb], ["Hukuki Haber", hukuki]] as const) {
    for (const h of haberler ?? []) {
      if (goruldu.has(h.baglanti) || !ONEMLI.test(h.baslik.toLocaleLowerCase("tr-TR"))) continue;
      const k = anahtarKelimeler(h.baslik);
      if (kelimeler.some((o) => benzerMi(o, k))) continue;
      goruldu.add(h.baglanti);
      kelimeler.push(k);
      liste.push({ ...h, kaynak });
    }
  }
  return liste.slice(0, adet);
}
