"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { gorevDurumuDegistir, gorevEkle, gorevSil } from "./actions";

type Gorev = {
  id: string;
  baslik: string;
  aciklama: string | null;
  sorumluId: string | null;
  sorumluAd: string;
  tamam: boolean;
  otomatik: boolean;
  tarih: string;
};

const alan = "rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-[15px] text-white outline-none [color-scheme:dark] focus:border-[var(--accent)]";

export function GorevListesi({
  gorevler,
  kisiler,
  benimId,
  tumBuro,
}: {
  gorevler: Gorev[];
  kisiler: { id: string; adSoyad: string }[];
  benimId: string;
  tumBuro: boolean;
}) {
  const [baslik, setBaslik] = useState("");
  const [sorumlu, setSorumlu] = useState(benimId);
  const [hata, setHata] = useState("");
  const [bitenAcik, setBitenAcik] = useState(false);
  const [bekliyor, basla] = useTransition();

  const gorunen = gorevler.filter((g) => tumBuro || g.sorumluId === benimId);
  const acik = gorunen.filter((g) => !g.tamam);
  const biten = gorunen.filter((g) => g.tamam).slice(0, 30);

  function ekle() {
    setHata("");
    basla(async () => {
      const s = await gorevEkle(baslik, sorumlu);
      if (s.hata) setHata(s.hata);
      else setBaslik("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/kokpit/bekleyen-gorevler" className={sekme(!tumBuro)}>
          Benim görevlerim
        </Link>
        <Link href="/kokpit/bekleyen-gorevler?kimin=buro" className={sekme(tumBuro)}>
          Tüm büro
        </Link>
        <span className="ml-auto text-sm text-white/50">{acik.length} açık</span>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <input
          value={baslik}
          onChange={(e) => setBaslik(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), ekle())}
          placeholder="Yapılacak işi yazın…"
          className={`${alan} min-w-0 flex-1 basis-56`}
        />
        <select value={sorumlu} onChange={(e) => setSorumlu(e.target.value)} className={`${alan} min-w-0`} aria-label="Sorumlu">
          {kisiler.map((k) => (
            <option key={k.id} value={k.id}>
              {k.adSoyad}
            </option>
          ))}
        </select>
        <button type="button" onClick={ekle} disabled={bekliyor || !baslik.trim()} className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          Ekle
        </button>
        {hata && <p className="basis-full text-sm text-red-300">{hata}</p>}
      </div>

      {acik.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
          <p className="text-lg font-medium text-white">Bekleyen iş yok</p>
          <p className="mt-1 text-sm">Hepsi tamam. Yeni bir iş çıkarsa yukarıdan ekleyebilirsiniz.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {acik.map((g) => (
            <Satir key={g.id} g={g} tumBuro={tumBuro} />
          ))}
        </ul>
      )}

      {biten.length > 0 && (
        <div>
          <button type="button" onClick={() => setBitenAcik((x) => !x)} className="text-sm text-white/55 hover:text-white">
            {bitenAcik ? "Tamamlananları gizle" : `Tamamlananlar (${biten.length})`}
          </button>
          {bitenAcik && (
            <ul className="mt-2 flex flex-col gap-2">
              {biten.map((g) => (
                <Satir key={g.id} g={g} tumBuro={tumBuro} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function sekme(secili: boolean) {
  return `rounded-full border px-4 py-1.5 text-sm ${secili ? "border-[var(--accent)] bg-[var(--accent)]/20 text-white" : "border-white/15 text-white/65 hover:bg-white/[0.06]"}`;
}

function Satir({ g, tumBuro }: { g: Gorev; tumBuro: boolean }) {
  const [bekliyor, basla] = useTransition();
  return (
    <li className={`flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 ${bekliyor ? "opacity-60" : ""}`}>
      <button
        type="button"
        aria-label={g.tamam ? "Tamamlandı, geri al" : "Tamamlandı olarak işaretle"}
        onClick={() => basla(() => gorevDurumuDegistir(g.id, !g.tamam))}
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${g.tamam ? "border-[#34c77b] bg-[#34c77b] text-white" : "border-white/35 hover:border-white/70"}`}
      >
        {g.tamam && <span className="text-xs">✓</span>}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] font-medium ${g.tamam ? "text-white/40 line-through" : "text-white"}`}>{g.baslik}</p>
        {g.aciklama && <p className="mt-0.5 text-sm text-white/55">{g.aciklama}</p>}
        <p className="mt-1 text-xs text-white/45">
          {tumBuro && <>{g.sorumluAd} · </>}
          {g.tarih}
          {g.otomatik && <span className="ml-2 rounded-full bg-[#f2b04c]/15 px-2 py-0.5 text-[#f2b04c]">otomatik</span>}
        </p>
      </div>
      <button type="button" aria-label="Görevi sil" onClick={() => basla(() => gorevSil(g.id))} className="rounded-lg px-2 py-1 text-white/35 hover:bg-white/10 hover:text-[#ff8a80]">
        ✕
      </button>
    </li>
  );
}
