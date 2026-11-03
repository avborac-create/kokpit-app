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
      .replace(/[^p{L}p{N}s]/gu, " ")
      .split(/s+/)
      .filter((k) => k.length > 2),
  );
}
function benzerMi(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  let ortak = 0;
  for (const k of a) if (b.has(k)) ortak++;
  return ortak / Math.min(a.size, b.size) >= 0.6;
}

export async function OnemliDuyuruBandi() {
  const [tbb, hukuki] = await Promise.all([tbbHaberleri(30), hukukHaberleri(30)]);
  const goruldu = new Set<string>();
  const liste: (Haber & { kaynak: string })[] = [];
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
  if (liste.length === 0) return null;
  return (
    <section className="rounded-3xl border-2 border-[#ff5f56] bg-[#ff5f56]/15 p-5 shadow-[0_0_28px_rgba(255,95,86,0.25)]" aria-label="Önemli mevzuat değişiklikleri">
      <h2 className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wider text-[#ff7a70]">
        <span aria-hidden="true">⚠️</span> Önemli değişiklik — dosyalarınızı etkileyebilir
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {liste.slice(0, 5).map((h) => (
          <li key={h.baglanti}>
            <a href={h.baglanti} target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-black/20 px-3 py-2 text-white hover:bg-black/30">
              <span className="text-[15px] font-bold leading-snug">{h.baslik}</span>
              <span className="mt-0.5 block text-xs text-white/55">{h.kaynak}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
