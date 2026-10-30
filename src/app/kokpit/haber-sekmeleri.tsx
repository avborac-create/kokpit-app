"use client";

import { useState } from "react";

export type HaberKalemi = { baslik: string; baglanti: string; ek?: string };
export type HaberKaynagi = { kod: string; ad: string; alt: string; kalemler: HaberKalemi[] };

// Hukuk gundemi: birden fazla kaynak sekme olarak; liste kisa, kendi icinde kayar.
export function HaberSekmeleri({ kaynaklar }: { kaynaklar: HaberKaynagi[] }) {
  const [secili, setSecili] = useState(kaynaklar[0]?.kod ?? "");
  const kaynak = kaynaklar.find((k) => k.kod === secili) ?? kaynaklar[0];
  if (!kaynak) return null;
  return (
    <section className="glass flex min-w-0 flex-col rounded-3xl p-5">
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
      <p className="mb-1 text-xs text-white/40">{kaynak.alt}</p>
      <ul className="max-h-60 min-h-0 flex-1 overflow-y-auto">
        {kaynak.kalemler.map((h) => (
          <li key={h.baglanti} className="border-b border-white/[0.07] py-2 last:border-0">
            <a href={h.baglanti} target="_blank" rel="noopener noreferrer" className="block text-white/90 hover:text-[#6db8ff]">
              <span className="text-sm font-medium leading-snug">{h.baslik}</span>
              {h.ek && <span className="mt-0.5 block text-xs text-white/40">{h.ek}</span>}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
