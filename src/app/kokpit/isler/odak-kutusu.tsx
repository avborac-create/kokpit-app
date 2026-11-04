"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DURUMLAR, turBilgisi } from "./durum";
import { durumDegistir, odakDegistir } from "./actions";

export type OdakKarti = { id: string; baslik: string; durum: string; tur: string; vade: string; maddeToplam: number; maddeTamam: number; sorumluAd: string };

// Odak Kutusu: kullanicinin su an odaklandigi gorevler, kanban kartlari gibi yan yana.
export function OdakKutusu({ kartlar, bugun }: { kartlar: OdakKarti[]; bugun: string }) {
  const yonlendirici = useRouter();
  const [bekliyor, basla] = useTransition();
  return (
    <section aria-label="Odak kutusu" className="mb-5 rounded-2xl border border-[#f2b04c]/40 bg-[#f2b04c]/[0.06] p-3">
      <h2 className="mb-2 flex items-center gap-2 px-1 text-[15px] font-semibold text-[#f2b04c]">
        🎯 Odak kutum
        <span className="rounded-full bg-[#f2b04c]/25 px-2 text-xs">{kartlar.length}/5</span>
      </h2>
      {kartlar.length === 0 ? (
        <p className="px-1 py-2 text-sm text-white/50">Henüz odaklandığınız görev yok. Bir görevdeki “🎯 Odaklan” düğmesine basınca buraya gelir.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {kartlar.map((k) => (
            <div key={k.id} className="rounded-xl border border-white/10 bg-[var(--background-2)] p-3">
              <Link href={`/kokpit/isler?is=${k.id}`} scroll={false} className="block text-[15px] font-medium text-white hover:underline">
                {k.baslik}
              </Link>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-white/55">
                <span style={{ color: turBilgisi(k.tur).renk }}>{turBilgisi(k.tur).kisa}</span>
                <span>👤 {k.sorumluAd}</span>
                {k.maddeToplam > 0 && <span>☑ {k.maddeTamam}/{k.maddeToplam}</span>}
                {k.vade && <span style={{ color: k.vade < bugun ? "#ff7a70" : undefined }}>📅 {new Date(k.vade + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {DURUMLAR.map((d) => (
                  <button key={d.anahtar} type="button" disabled={bekliyor} onClick={() => basla(async () => { await durumDegistir(k.id, d.anahtar); yonlendirici.refresh(); })} className="rounded-full border px-2.5 py-0.5 text-xs font-medium" style={k.durum === d.anahtar ? { background: d.renk, borderColor: d.renk, color: "#fff" } : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}>
                    {d.ad}
                  </button>
                ))}
                <button type="button" disabled={bekliyor} onClick={() => basla(async () => { await odakDegistir(k.id); yonlendirici.refresh(); })} className="ml-auto rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-white/60 hover:bg-white/10">
                  Odaktan çıkar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
