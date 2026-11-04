"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const ANAHTAR = "kokpit_defter_gorunumu";
const SIRA_ANAHTARI = "kokpit_defter_siralamasi";
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
    // Varsayilan gorunum: Tablo (kullanici baska bir gorunum sectiyse o hatirlanir)
    return k === "gosterge" || k === "akis" ? k : "tablo";
  } catch {
    return "tablo";
  }
}

function siraOku(): boolean {
  try {
    return localStorage.getItem(SIRA_ANAHTARI) === "yeni";
  } catch {
    return false;
  }
}

// Varsayilan: eskiden yeniye (yeni kayitlar en altta). Secim bu tarayicida hatirlanir.
export function DefterGorunumSecici({
  akis,
  gosterge,
  tablo,
  tersAkis,
  tersGosterge,
  tersTablo,
}: {
  akis: ReactNode;
  gosterge: ReactNode;
  tablo: ReactNode;
  tersAkis: ReactNode;
  tersGosterge: ReactNode;
  tersTablo: ReactNode;
}) {
  const gorunum = useSyncExternalStore(abone, oku, () => "tablo" as Gorunum);
  const yeniUstte = useSyncExternalStore(abone, siraOku, () => false);

  function siraDegistir() {
    try {
      localStorage.setItem(SIRA_ANAHTARI, yeniUstte ? "eski" : "yeni");
    } catch {
      /* depolama kapaliysa secim hatirlanmaz */
    }
    dinleyiciler.forEach((f) => f());
  }

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
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={siraDegistir}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/70 hover:text-white"
          title="Kayıtların sıralamasını değiştir"
        >
          {yeniUstte ? "Sıra: yeni kayıtlar üstte ↑" : "Sıra: yeni kayıtlar altta ↓"}
        </button>
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
      {gorunum === "akis" ? (yeniUstte ? tersAkis : akis) : gorunum === "gosterge" ? (yeniUstte ? tersGosterge : gosterge) : yeniUstte ? tersTablo : tablo}
    </div>
  );
}
