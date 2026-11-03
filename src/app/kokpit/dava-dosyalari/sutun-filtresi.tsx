"use client";

import { useEffect, useRef, useState } from "react";

// Sutun basliklarindaki filtre: kisiye ozel (tarayicida hatirlanir), GIZLENEN degerlerin listesi.
// Ayni onbellekli useSyncExternalStore deseni (bkz. dosyalar-tablosu.tsx): getSnapshot ham metin
// degismedikce AYNI referansi dondurur.
const ANAHTAR = "kokpit-dava-dosyalari-sutun-filtreleri";
export type SutunFiltreleri = Record<string, string[]>;
export const BOS_FILTRE: SutunFiltreleri = {};
const dinleyiciler = new Set<() => void>();
let onbellek: { ham: string | null; sonuc: SutunFiltreleri } = { ham: undefined as unknown as string, sonuc: BOS_FILTRE };

export function filtreleriOku(): SutunFiltreleri {
  let ham: string | null;
  try {
    ham = localStorage.getItem(ANAHTAR);
  } catch {
    ham = null;
  }
  if (ham === onbellek.ham) return onbellek.sonuc;
  let sonuc = BOS_FILTRE;
  if (ham) {
    try {
      const j = JSON.parse(ham) as Record<string, unknown>;
      const temiz: SutunFiltreleri = {};
      for (const [k, v] of Object.entries(j)) {
        if (Array.isArray(v)) {
          const l = v.filter((x): x is string => typeof x === "string");
          if (l.length > 0) temiz[k] = l;
        }
      }
      if (Object.keys(temiz).length > 0) sonuc = temiz;
    } catch {
      sonuc = BOS_FILTRE;
    }
  }
  onbellek = { ham, sonuc };
  return sonuc;
}

export function filtreleriYaz(f: SutunFiltreleri) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(f));
  } catch {
    // localStorage erisilemez - sessizce yok say
  }
  dinleyiciler.forEach((d) => d());
}

export function filtreleriAbone(d: () => void) {
  dinleyiciler.add(d);
  return () => dinleyiciler.delete(d);
}

export function SutunFiltresi({
  etiket,
  degerler,
  gizli,
  degistir,
  rozetSinifi,
}: {
  etiket: string;
  degerler: string[];
  gizli: string[];
  degistir: (yeniGizli: string[]) => void;
  // Verilirse degerler renkli rozet olarak listelenir (ör. dosya durumu).
  rozetSinifi?: (deger: string) => string;
}) {
  const [acik, setAcik] = useState(false);
  const [konum, setKonum] = useState<{ top: number; left: number } | null>(null);
  const [ara, setAra] = useState("");
  const dugme = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const aktif = gizli.length > 0;

  useEffect(() => {
    if (!acik) return;
    function disariTikla(e: PointerEvent) {
      const hedef = e.target as Node;
      if (panel.current?.contains(hedef) || dugme.current?.contains(hedef)) return;
      setAcik(false);
    }
    function kapat(e: KeyboardEvent) {
      if (e.key === "Escape") setAcik(false);
    }
    window.addEventListener("pointerdown", disariTikla);
    window.addEventListener("keydown", kapat);
    return () => {
      window.removeEventListener("pointerdown", disariTikla);
      window.removeEventListener("keydown", kapat);
    };
  }, [acik]);

  function ac() {
    if (acik) {
      setAcik(false);
      return;
    }
    const r = dugme.current?.getBoundingClientRect();
    if (r) setKonum({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 268)) });
    setAra("");
    setAcik(true);
  }

  const gorunen = degerler.filter((d) => d.toLocaleLowerCase("tr-TR").includes(ara.toLocaleLowerCase("tr-TR")));

  function degistirDeger(d: string) {
    degistir(gizli.includes(d) ? gizli.filter((x) => x !== d) : [...gizli, d]);
  }

  return (
    <>
      <button
        ref={dugme}
        type="button"
        onClick={ac}
        aria-label={`${etiket} sütununu filtrele`}
        title={aktif ? `${gizli.length} değer gizli — filtreyi düzenle` : "Bu sütunda filtrele"}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${aktif ? "bg-[var(--accent)] text-white" : "text-white/35 hover:bg-white/10 hover:text-white"}`}
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
          <path d="M3 4h18l-7 8.5V19l-4 2v-8.5z" />
        </svg>
      </button>
      {acik && konum && (
        <div
          ref={panel}
          style={{ top: konum.top, left: konum.left }}
          className="fixed z-50 w-64 rounded-xl border border-white/20 bg-[var(--yuzey,#1c2432)] p-2 text-sm font-normal normal-case text-white shadow-2xl"
        >
          <p className="px-2 pb-1 text-xs text-white/50">{etiket} — görünecek değerler</p>
          {degerler.length > 8 && (
            <input
              value={ara}
              onChange={(e) => setAra(e.target.value)}
              placeholder="Ara…"
              className="mb-1 w-full rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-sm text-white outline-none focus:border-[var(--accent)]"
            />
          )}
          <div className="max-h-64 overflow-y-auto">
            {gorunen.map((d) => (
              <label key={d} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10">
                <input type="checkbox" className="onay-kutusu" checked={!gizli.includes(d)} onChange={() => degistirDeger(d)} />
                {rozetSinifi ? (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rozetSinifi(d)}`}>{d}</span>
                ) : (
                  <span className="truncate">{d}</span>
                )}
              </label>
            ))}
            {gorunen.length === 0 && <p className="px-2 py-2 text-white/40">Sonuç yok.</p>}
          </div>
          <div className="mt-1 flex justify-between border-t border-white/10 pt-1 text-xs">
            <button type="button" onClick={() => degistir([])} disabled={!aktif} className="rounded-lg px-2 py-1.5 text-[var(--link)] hover:bg-white/10 disabled:opacity-40">
              Tümünü göster
            </button>
            <button type="button" onClick={() => degistir(degerler)} className="rounded-lg px-2 py-1.5 text-white/60 hover:bg-white/10">
              Tümünü gizle
            </button>
          </div>
        </div>
      )}
    </>
  );
}
