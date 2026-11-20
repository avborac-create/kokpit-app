"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gelistirmeDurumDegistir, gelistirmeEkle, gelistirmeNotEkle } from "./actions";
import { AKISLAR, OLGUNLUKLAR } from "./sabitler";

export type GelistirmeKarti = {
  id: string;
  baslik: string;
  aciklama: string | null;
  modul: string | null;
  akis: string;
  olgunluk: string;
  gecmis: { t: string; kim: string; ozet: string }[];
};

export function GelistirmeSatiri({ g }: { g: GelistirmeKarti }) {
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState("");
  const [gecmisAcik, setGecmisAcik] = useState(false);
  const [not, setNot] = useState("");
  const olg = OLGUNLUKLAR.find((x) => x.k === g.olgunluk);
  const akis = AKISLAR.find((x) => x.k === g.akis);

  function calistir(is: () => Promise<{ hata?: string }>) {
    setHata("");
    basla(async () => {
      const s = await is();
      if (s.hata) setHata(s.hata);
      else router.refresh();
    });
  }

  return (
    <div className="glass rounded-xl p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{g.baslik}</p>
          {g.modul && <p className="text-[11px] text-white/40">{g.modul}</p>}
          {g.aciklama && <p className="mt-1 text-xs text-white/60">{g.aciklama}</p>}
        </div>
        <span title={olg?.aciklama} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${olg?.sinif}`}>
          {olg?.ad}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select aria-label="İş akışı" disabled={bekliyor} value={g.akis} onChange={(e) => calistir(() => gelistirmeDurumDegistir(g.id, "akis", e.target.value))} className={`rounded-md border border-white/15 bg-black/20 px-2 py-1 text-xs text-white`}>
          {AKISLAR.map((a) => (
            <option key={a.k} value={a.k}>
              {a.ad}
            </option>
          ))}
        </select>
        <select aria-label="Olgunluk" disabled={bekliyor} value={g.olgunluk} onChange={(e) => calistir(() => gelistirmeDurumDegistir(g.id, "olgunluk", e.target.value))} className="rounded-md border border-white/15 bg-black/20 px-2 py-1 text-xs text-white">
          {OLGUNLUKLAR.map((a) => (
            <option key={a.k} value={a.k}>
              {a.ad}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setGecmisAcik((a) => !a)} className="ml-auto text-[11px] text-white/45 hover:underline">
          Geçmiş ({g.gecmis.length})
        </button>
      </div>
      {gecmisAcik && (
        <div className="mt-2 border-t border-white/10 pt-2 text-xs text-white/60">
          {[...g.gecmis].reverse().map((i, n) => (
            <p key={n}>
              <span className="text-white/35">{new Date(i.t).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" })}</span> · {i.kim}: {i.ozet}
            </p>
          ))}
          <div className="mt-2 flex gap-2">
            <input value={not} onChange={(e) => setNot(e.target.value)} placeholder="Not ekle…" className="flex-1 rounded-md border border-white/15 bg-black/20 px-2 py-1 text-xs text-white outline-none" />
            <button type="button" disabled={bekliyor} onClick={() => calistir(async () => { const s = await gelistirmeNotEkle(g.id, not); if (!s.hata) setNot(""); return s; })} className="rounded-md border border-white/20 px-2 text-xs text-white/80 hover:bg-white/10">
              Ekle
            </button>
          </div>
        </div>
      )}
      {hata && <p className="mt-1 text-xs text-[#ff7a70]">{hata}</p>}
      {akis && <span className="sr-only">{akis.ad}</span>}
    </div>
  );
}

export function YeniGelistirmeFormu() {
  const router = useRouter();
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [modul, setModul] = useState("");
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  return (
    <div className="glass mb-5 rounded-2xl p-4">
      <p className="mb-2 text-sm font-medium text-white">Yeni talep</p>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        <input value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder="Başlık" className="rounded-md border border-white/20 bg-black/20 px-3 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]" />
        <input value={modul} onChange={(e) => setModul(e.target.value)} placeholder="Modül (isteğe bağlı)" className="rounded-md border border-white/20 bg-black/20 px-3 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]" />
      </div>
      <textarea value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Açıklama" rows={2} className="mt-2 w-full rounded-md border border-white/20 bg-black/20 px-3 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]" />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={bekliyor}
          onClick={() =>
            basla(async () => {
              const s = await gelistirmeEkle(baslik, aciklama, modul);
              if (s.hata) setHata(s.hata);
              else {
                setHata("");
                setBaslik("");
                setAciklama("");
                setModul("");
                router.refresh();
              }
            })
          }
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#0b1d36] disabled:opacity-50"
        >
          Talep ekle
        </button>
        {hata && <span className="text-xs text-[#ff7a70]">{hata}</span>}
      </div>
    </div>
  );
}
