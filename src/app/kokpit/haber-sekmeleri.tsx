"use client";

import { useState } from "react";

export type HaberKalemi = { baslik: string; baglanti: string; ek?: string };
export type HaberKaynagi = { kod: string; ad: string; alt: string; kalemler: HaberKalemi[] };

// Onemli degisiklik kartlari: soldaki renk cubugu onem sirasini gosterir (kirmizi > sari > mavi).
const ONEM_RENKLERI = [
  { cubuk: "#E24B4A", yazi: "#ff8a80", etiket: "Önemli" },
  { cubuk: "#EF9F27", yazi: "#f5be6b", etiket: "Mevzuat" },
  { cubuk: "#378ADD", yazi: "#6db8ff", etiket: "Duyuru" },
];

// Hukuk gundemi: birden fazla kaynak sekme olarak; liste kisa, kendi icinde kayar.
export function HaberSekmeleri({ kaynaklar, onemli = [] }: { kaynaklar: HaberKaynagi[]; onemli?: HaberKalemi[] }) {
  const [secili, setSecili] = useState(kaynaklar[0]?.kod ?? "");
  const kaynak = kaynaklar.find((k) => k.kod === secili) ?? kaynaklar[0];
  if (!kaynak) return null;
  const liste = (
    <ul>
      {kaynak.kalemler.map((h) => (
        <li key={h.baglanti} className="border-b border-white/[0.07] py-2">
          <a href={h.baglanti} target="_blank" rel="noopener noreferrer" className="block text-white/90 hover:text-[#6db8ff]">
            <span className="text-sm font-medium leading-snug">{h.baslik}</span>
            {h.ek && <span className="mt-0.5 block text-xs text-white/40">{h.ek}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="glass flex h-full min-w-0 flex-col rounded-3xl p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Hukuk gündemi</h2>
        <div className="flex gap-1" role="tablist">
          {kaynaklar.map((k) => (
            <button
              key={k.kod}
              type="button"
              role="tab"
              aria-selected={k.kod === kaynak.kod}
              onClick={() => setSecili(k.kod)}
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                k.kod === kaynak.kod ? "bg-[var(--accent)] font-medium text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {k.ad}
            </button>
          ))}
        </div>
      </div>
      {onemli.length > 0 && (
        <div className="mb-2 border-b border-white/[0.07] pb-2" aria-label="Önemli mevzuat değişiklikleri">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#ff8a80]">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#ff5f56]" />
            Önemli değişiklik
          </p>
          <ul className="flex flex-col gap-1.5">
            {onemli.map((h, i) => {
              const renk = ONEM_RENKLERI[Math.min(i, ONEM_RENKLERI.length - 1)];
              return (
                <li key={h.baglanti} className="border-l-[3px] bg-white/[0.04]" style={{ borderLeftColor: renk.cubuk }}>
                  <a
                    href={h.baglanti}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={h.baslik}
                    className="block px-3 py-1.5 hover:bg-white/[0.06]"
                  >
                    <span className="mb-0.5 block text-[11px]" style={{ color: renk.yazi }}>
                      {i === 0 ? "Yeni" : renk.etiket}
                      {h.ek ? ` · ${h.ek}` : ""}
                    </span>
                    <span className={`line-clamp-2 block text-[13px] leading-snug text-white/90 ${i === 0 ? "font-medium" : ""}`}>
                      {h.baslik}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="mb-1 text-xs text-white/40">{kaynak.alt}</p>
      {/* Yukari kayan akis (uzerine gelince durur); yukseklik yandaki panele esitlenir. */}
      <div className="relative min-h-60 flex-1">
        <div key={kaynak.kod} className="haber-akisi absolute inset-0 overflow-hidden motion-reduce:overflow-y-auto">
          <div className="haber-akisi-ic">
            {liste}
            <div aria-hidden="true" className="motion-reduce:hidden">
              {liste}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
