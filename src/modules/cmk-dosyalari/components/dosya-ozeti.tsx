// Dosya notlarini "BASLIK: metin" satirlarina gore bolumlere ayirip katlanabilir kartlar olarak gosterir.
// Basliksiz / ayristirilamayan notlar eskisi gibi duz metin olarak basilir.

type Bolum = { baslik: string; metin: string };

const BASLIK_DESENI = /^([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9 /.'’-]{2,40}(?: \([^)]{1,40}\))?):\s*(.*)$/;

function bolumlereAyir(notlar: string): Bolum[] {
  const bolumler: Bolum[] = [];
  for (const satir of notlar.split(/\r?\n/)) {
    const eslesme = BASLIK_DESENI.exec(satir.trim());
    if (eslesme) bolumler.push({ baslik: eslesme[1], metin: eslesme[2] });
    else if (bolumler.length > 0 && satir.trim()) bolumler[bolumler.length - 1].metin += `\n${satir.trim()}`;
    else if (satir.trim()) bolumler.push({ baslik: "NOT", metin: satir.trim() });
  }
  return bolumler;
}

export function DosyaOzeti({ notlar }: { notlar: string }) {
  const bolumler = bolumlereAyir(notlar);
  if (bolumler.length < 2) {
    return <p className="glass mb-4 whitespace-pre-line rounded-2xl p-4 text-sm leading-relaxed text-white/70">{notlar}</p>;
  }
  return (
    <section className="glass mb-4 overflow-hidden rounded-2xl">
      <h2 className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-white/40">Dosya özeti</h2>
      <div className="divide-y divide-white/10">
        {bolumler.map((b, i) => (
          <details key={`${b.baslik}-${i}`} open={i === 0} className="group px-4 py-2.5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[#6db8ff]">
              <span className="uppercase tracking-wide">{b.baslik}</span>
              <span className="text-white/30 transition-transform group-open:rotate-90">›</span>
            </summary>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/75">{b.metin}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
