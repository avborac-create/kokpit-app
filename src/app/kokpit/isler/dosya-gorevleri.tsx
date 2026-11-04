"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { isEkle } from "./actions";

export type DosyaGorevi = { id: string; baslik: string; durumAd: string; renk: string; kapali: boolean; sorumluAd: string; vade: string };

const alan = "alan-bmw [color-scheme:dark]";

// Dosya sayfasindaki "Gorevler" sekmesi: dosyaya bagli gorev yazilir, kisiye atanir; gorev Gorevler ekraninda da gorunur.
export function DosyaGorevleri({ dosyaId, benimId, kisiler, gorevler }: { dosyaId: string; benimId: string; kisiler: { id: string; adSoyad: string }[]; gorevler: DosyaGorevi[] }) {
  const yonlendirici = useRouter();
  const [baslik, setBaslik] = useState("");
  const [sorumlu, setSorumlu] = useState(benimId);
  const [vade, setVade] = useState("");
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();

  function ata() {
    setHata("");
    basla(async () => {
      const s = await isEkle(baslik, sorumlu, "", "", dosyaId, vade);
      if (s.hata) setHata(s.hata);
      else {
        setBaslik("");
        setVade("");
        yonlendirici.refresh();
      }
    });
  }

  const acik = gorevler.filter((g) => !g.kapali);
  const kapali = gorevler.filter((g) => g.kapali);
  const satir = (g: DosyaGorevi) => (
    <li key={g.id}>
      <Link href={`/kokpit/isler?is=${g.id}`} className="alan-hucre flex flex-wrap items-center justify-between gap-2 text-sm hover:bg-white/[0.07]">
        <div className="min-w-0">
          <p className={`font-medium ${g.kapali ? "text-white/55 line-through" : "text-white"}`}>{g.baslik}</p>
          <p className="text-xs text-white/50">
            👤 {g.sorumluAd}
            {g.vade ? ` · 📅 ${new Date(g.vade + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}` : ""}
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: g.renk + "26", color: g.renk }}>
          {g.durumAd}
        </span>
      </Link>
    </li>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <input value={baslik} onChange={(e) => setBaslik(e.target.value)} onKeyDown={(e) => e.key === "Enter" && baslik.trim() && ata()} placeholder="Bu dosya için görev yazın…" className={alan} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={sorumlu} onChange={(e) => setSorumlu(e.target.value)} aria-label="Kime atanacak" className={`${alan} sm:flex-1`}>
            {kisiler.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id === benimId ? `${c.adSoyad} (ben)` : c.adSoyad}
              </option>
            ))}
          </select>
          <input type="date" value={vade} onChange={(e) => setVade(e.target.value)} aria-label="Bitiş tarihi (isteğe bağlı)" className={`${alan} sm:w-44`} />
          <button type="button" onClick={ata} disabled={bekliyor || !baslik.trim()} className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {sorumlu !== benimId ? "Ata" : "Ekle"}
          </button>
        </div>
        {hata && <p className="text-sm text-red-300">{hata}</p>}
      </div>

      {gorevler.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/40">Bu dosya için görev yok.</p>
      ) : (
        <>
          {acik.length > 0 && <ul className="flex flex-col gap-2">{acik.map(satir)}</ul>}
          {kapali.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm text-white/55">Tamamlananlar ({kapali.length})</summary>
              <ul className="mt-2 flex flex-col gap-2">{kapali.map(satir)}</ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
