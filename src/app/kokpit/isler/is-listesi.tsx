"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { isEkle } from "./actions";
import { DURUMLAR, durumBilgisi } from "./durum";

type Is = {
  id: string;
  baslik: string;
  durum: string;
  sorumluId: string | null;
  sorumluAd: string;
  yorumSayisi: number;
  maddeToplam: number;
  maddeTamam: number;
  yardimBenim: boolean;
  yardimIsteyen: string;
  destekMi: boolean;
  tarih: string;
};

const alan = "rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-[15px] text-white outline-none [color-scheme:dark] focus:border-[var(--accent)]";

export function IsListesi({ isler, kisiler, benimId, tumBuro }: { isler: Is[]; kisiler: { id: string; adSoyad: string }[]; benimId: string; tumBuro: boolean }) {
  const yonlendirici = useRouter();
  const [baslik, setBaslik] = useState("");
  const [sorumlu, setSorumlu] = useState(benimId);
  const [destek, setDestek] = useState("");
  const [hata, setHata] = useState("");
  const [filtre, setFiltre] = useState<string>("ACIK");
  const [bekliyor, basla] = useTransition();

  const gorunen = isler.filter((i) => (tumBuro || i.sorumluId === benimId || i.yardimBenim) && (filtre === "HEPSI" ? true : filtre === "ACIK" ? i.durum !== "TAMAMLANDI" : i.durum === filtre));

  function ekle() {
    setHata("");
    basla(async () => {
      const s = await isEkle(baslik, sorumlu, "", destek);
      if (s.hata) setHata(s.hata);
      else if (s.id) yonlendirici.push(`/kokpit/isler/${s.id}`);
    });
  }

  const sekme = (secili: boolean) => `rounded-full px-3.5 py-1.5 text-sm ${secili ? "bg-white/15 font-semibold text-white" : "text-white/60 hover:bg-white/10"}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/kokpit/isler" className={sekme(!tumBuro)}>
          Benim işlerim
        </Link>
        <Link href="/kokpit/isler?kimin=buro" className={sekme(tumBuro)}>
          Tüm büro
        </Link>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 sm:flex-row">
        <input value={baslik} onChange={(e) => setBaslik(e.target.value)} onKeyDown={(e) => e.key === "Enter" && baslik.trim() && ekle()} placeholder="Yeni konu / iş başlığı…" className={`${alan} flex-1`} />
        <select value={sorumlu} onChange={(e) => setSorumlu(e.target.value)} className={alan}>
          {kisiler.map((c) => (
            <option key={c.id} value={c.id}>
              {c.adSoyad}
            </option>
          ))}
        </select>
        <select value={destek} onChange={(e) => setDestek(e.target.value)} className={alan} title="Destek (yardımcı) kişi">
          <option value="">Destek yok</option>
          {kisiler.filter((c) => c.id !== sorumlu).map((c) => (
            <option key={c.id} value={c.id}>
              Destek: {c.adSoyad}
            </option>
          ))}
        </select>
        <button type="button" onClick={ekle} disabled={bekliyor || !baslik.trim()} className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          Aç
        </button>
      </div>
      {hata && <p className="text-sm text-red-300">{hata}</p>}

      <div className="flex flex-wrap gap-1.5">
        {[{ anahtar: "ACIK", ad: "Açık olanlar" }, ...DURUMLAR.map((d) => ({ anahtar: d.anahtar as string, ad: d.ad })), { anahtar: "HEPSI", ad: "Hepsi" }].map((f) => (
          <button key={f.anahtar} type="button" onClick={() => setFiltre(f.anahtar)} className={`rounded-full border px-3 py-1 text-xs ${filtre === f.anahtar ? "border-white/40 bg-white/15 text-white" : "border-white/10 text-white/55"}`}>
            {f.ad}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {gorunen.length === 0 && <li className="px-1 py-6 text-center text-sm text-white/45">Bu görünümde iş yok.</li>}
        {gorunen.map((i) => {
          const d = durumBilgisi(i.durum);
          return (
            <li key={i.id}>
              <Link href={`/kokpit/isler/${i.id}`} className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 hover:bg-white/[0.07]">
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 text-[15px] font-medium text-white">{i.baslik}</span>
                  <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: d.renk + "26", color: d.renk }}>
                    {d.ad}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/50">
                  {i.yardimBenim && i.sorumluId !== benimId && (
                    <span className="rounded-full bg-[#8b5cf6]/25 px-2 py-0.5 font-semibold text-[#c4b5fd]">🤝 {i.destekMi ? "Destek" : "Yardım"}{i.yardimIsteyen ? ` · ${i.yardimIsteyen} ${i.destekMi ? "atadı" : "istedi"}` : ""}</span>
                  )}
                  <span>{i.sorumluAd}</span>
                  {i.maddeToplam > 0 && (
                    <span>
                      ☑ {i.maddeTamam}/{i.maddeToplam}
                    </span>
                  )}
                  {i.yorumSayisi > 0 && <span>💬 {i.yorumSayisi}</span>}
                  <span className="ml-auto">{i.tarih}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
