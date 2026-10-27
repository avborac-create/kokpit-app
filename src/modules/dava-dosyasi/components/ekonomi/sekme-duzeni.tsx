"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

export type DuzenSekme = { anahtar: string; etiket: string; rozet?: string; href: string };
export type DuzenKat = { baslik: string; sekmeler: DuzenSekme[] };

const DUZENLER = [
  { id: "klasik", ad: "Klasik" },
  { id: "cerceveli", ad: "Çerçeveli" },
  { id: "yasli", ad: "İki yana yaslı" },
] as const;
type DuzenId = (typeof DUZENLER)[number]["id"];
const ANAHTAR = "kokpit-ekonomi-sekme-duzeni";

const dinleyiciler = new Set<() => void>();
const abone = (cb: () => void) => {
  dinleyiciler.add(cb);
  return () => void dinleyiciler.delete(cb);
};
const oku = (): DuzenId => {
  try {
    const k = localStorage.getItem(ANAHTAR);
    if (DUZENLER.some((d) => d.id === k)) return k as DuzenId;
  } catch {}
  return "klasik";
};

export function SekmeDuzeni({ katlar, aktif }: { katlar: DuzenKat[]; aktif: string }) {
  const duzen = useSyncExternalStore(abone, oku, () => "klasik" as DuzenId);

  const sec = (id: DuzenId) => {
    try {
      localStorage.setItem(ANAHTAR, id);
    } catch {}
    dinleyiciler.forEach((cb) => cb());
  };

  const yasli = duzen === "yasli";
  const kapsayici =
    duzen === "klasik"
      ? "space-y-2 border-b border-white/[0.08] pb-4"
      : "space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3";

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-end gap-1 text-[11px] text-white/40">
        <span className="mr-1">Sekme düzeni:</span>
        {DUZENLER.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => sec(d.id)}
            className={`rounded-full border px-2 py-0.5 transition-colors ${
              duzen === d.id ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white" : "border-white/10 hover:text-white"
            }`}
          >
            {d.ad}
          </button>
        ))}
      </div>
      <div className={kapsayici}>
        {katlar.map((kat, i) => (
          <div key={i} className={`flex flex-wrap gap-1.5 ${yasli ? "items-stretch" : "items-center"}`}>
            {(kat.baslik || yasli) && (
              <span
                className={`mr-1 w-32 shrink-0 text-[11px] font-semibold tracking-wide text-white/35 ${yasli ? "flex items-center px-1" : ""}`}
              >
                {kat.baslik || "GENEL"}
              </span>
            )}
            {kat.sekmeler.map((sk) => (
              <Link
                key={sk.anahtar}
                href={sk.href}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  yasli ? "flex-1 justify-center whitespace-nowrap" : ""
                } ${
                  sk.anahtar === aktif
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                    : "border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {sk.etiket}
                {sk.rozet && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70">{sk.rozet}</span>}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
