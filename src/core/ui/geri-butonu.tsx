"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Her sayfada (telefon ve masaustu) ust cubukta "Geri" ve "Ileri": tarayici gecmisinde gezinir
// (ana ekrana eklenmis uygulamada tarayicinin kendi dugmeleri olmadigi icin gerekli).
// Geri: gecmis yoksa Ana Sayfa'ya gider. Ileri: tarayici destekliyorsa ileri gidilecek sayfa
// yokken soluk gorunur (desteklemiyorsa her zaman etkin).
type GezinmeNesnesi = { canGoForward?: boolean; addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void };

const dugme =
  "glass inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/90 outline-none transition-colors hover:bg-white/10 active:opacity-60 disabled:opacity-30 md:h-9 md:w-9";

export function GeriButonu() {
  const yonlendirici = useRouter();
  const [ileriVar, setIleriVar] = useState(true);

  useEffect(() => {
    const g = (window as unknown as { navigation?: GezinmeNesnesi }).navigation;
    if (!g || typeof g.canGoForward !== "boolean") return;
    const guncelle = () => setIleriVar(!!g.canGoForward);
    guncelle();
    g.addEventListener("currententrychange", guncelle);
    return () => g.removeEventListener("currententrychange", guncelle);
  }, []);

  function geri() {
    if (window.history.length > 1) yonlendirici.back();
    else yonlendirici.push("/kokpit");
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button type="button" onClick={geri} aria-label="Geri" title="Geri" className={dugme}>
        <svg viewBox="0 0 12 20" className="h-[16px] w-[10px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 2 2 10l8 8" />
        </svg>
      </button>
      <button type="button" onClick={() => window.history.forward()} disabled={!ileriVar} aria-label="İleri" title="İleri" className={dugme}>
        <svg viewBox="0 0 12 20" className="h-[16px] w-[10px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m2 2 8 8-8 8" />
        </svg>
      </button>
    </div>
  );
}
