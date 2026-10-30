"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const ANAHTAR = "kokpit_defter_gorunumu";
const GORUNUMLER = [
  { anahtar: "akis", etiket: "Akış" },
  { anahtar: "gosterge", etiket: "Gösterge" },
  { anahtar: "tablo", etiket: "Tablo" },
] as const;
type Gorunum = (typeof GORUNUMLER)[number]["anahtar"];

// Cari defterin gorunumunu kullanici secer; secim bu tarayicida hatirlanir.
const dinleyiciler = new Set<() => void>();
function abone(f: () => void) {
  dinleyiciler.add(f);
  window.addEventListener("storage", f);
  return () => {
    dinleyiciler.delete(f);
    window.removeEventListener("storage", f);
  };
}
function oku(): Gorunum {
  try {
    const k = localStorage.getItem(ANAHTAR);
    return k === "gosterge" || k === "tablo" ? k : "akis";
  } catch {
    return "akis";
  }
}

export function DefterGorunumSecici({ akis, gosterge, tablo }: { akis: ReactNode; gosterge: ReactNode; tablo: ReactNode }) {
  const gorunum = useSyncExternalStore(abone, oku, () => "akis" as Gorunum);

  function sec(g: Gorunum) {
    try {
      localStorage.setItem(ANAHTAR, g);
    } catch {
      /* depolama kapaliysa secim yalniz bu sayfada gecerli olmaz */
    }
    dinleyiciler.forEach((f) => f());
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <div className="inline-flex gap-0.5 rounded-lg border border-white/10 bg-white/[0.04] p-0.5" role="group" aria-label="Defter görünümü">
          {GORUNUMLER.map((g) => (
            <button
              key={g.anahtar}
              type="button"
              onClick={() => sec(g.anahtar)}
              aria-pressed={gorunum === g.anahtar}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                gorunum === g.anahtar ? "bg-[var(--accent)] font-medium text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {g.etiket}
            </button>
          ))}
        </div>
      </div>
      {gorunum === "akis" ? akis : gorunum === "gosterge" ? gosterge : tablo}
    </div>
  );
}
