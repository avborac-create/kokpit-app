"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type DosyaSekmesi = "genel" | "evrak" | "gorevler" | "ekonomi";

// Sayfanin ustunde sekme cubugu (BMW stili: keskin bloklar, aktif sekme dolgulu ve altinda kirmizi serit);
// sekmeler searchParams (?sekme=) ile calisir. Dort kisa baslik tek satira sigar, yana kayma olmaz.
// scroll={false}: sekme degisince sayfa basa atlamaz, bulundugunuz yerde kalir.
// Ara kararlar ve her turlu is "Dosya Görevleri" uzerinden takip edilir.
//
// dosyaId verilmezse (ör. Yeni Dosya olusturma ekrani - dosya henuz yok,
// baska bir sekmeye gidilecek bir yer yok) TUM sekmeler tiklanamaz olur.
// Sekme cubugu sayfa kaydirilinca da ustte sabit kalir (md ve uzeri); solunda hangi dosyada olundugu kisaca yazar.
export function DavaDosyasiSekmeleri({ dosyaId, aktif, kimlik, taraflar }: { dosyaId?: string; aktif: DosyaSekmesi; kimlik?: string; taraflar?: string }) {
  const sekmeler: { anahtar: DosyaSekmesi; etiket: string }[] = [
    { anahtar: "genel", etiket: "Genel" },
    { anahtar: "evrak", etiket: "Evraklar" },
    { anahtar: "gorevler", etiket: "Görevler" },
    { anahtar: "ekonomi", etiket: "Dosya Ekonomisi" },
  ];

  // Dosya kimligi (sagda) yalniz cubuk ustte sabitlenince gorunur; sayfa basindayken dosya basligi zaten ekranda.
  const [sabitlendi, setSabitlendi] = useState(false);
  const nobetci = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = nobetci.current;
    if (!el) return;
    const gozlemci = new IntersectionObserver(([giris]) => setSabitlendi(!giris.isIntersecting), { threshold: 0 });
    gozlemci.observe(el);
    return () => gozlemci.disconnect();
  }, []);

  return (
    <>
    <div ref={nobetci} aria-hidden className="h-px w-full" />
    <div className="sticky top-0 z-30 -mx-3 mb-4 flex items-center gap-4 border-b border-white/[0.08] bg-[color-mix(in_srgb,var(--background-2)_95%,transparent)] px-3 py-1.5 backdrop-blur-md md:-mx-6 md:px-6">
    <div className="flex w-full max-w-2xl shrink-0 gap-1 md:gap-5" role="tablist" aria-label="Dosya bölümleri">
      {sekmeler.map((sekme) => {
        const aktifMi = sekme.anahtar === aktif;
        const siniflar = `min-w-0 flex-1 truncate border-b-2 px-1 py-1.5 text-center text-xs font-medium sm:text-sm md:flex-none md:px-0.5 ${
          aktifMi
            ? "border-[var(--link)] font-semibold text-white"
            : "border-transparent text-white/60 hover:text-white"
        }`;
        if (!dosyaId || aktifMi) {
          return (
            <div key={sekme.anahtar} role="tab" aria-selected={aktifMi} className={siniflar}>
              {sekme.etiket}
            </div>
          );
        }
        return (
          <Link
            key={sekme.anahtar}
            role="tab"
            aria-selected={false}
            scroll={false}
            href={sekme.anahtar === "genel" ? `/kokpit/dava-dosyalari/${dosyaId}` : `/kokpit/dava-dosyalari/${dosyaId}?sekme=${sekme.anahtar}`}
            className={siniflar}
          >
            {sekme.etiket}
          </Link>
        );
      })}
    </div>
      {kimlik && (
        <span
          className={`ml-auto hidden min-w-0 text-right leading-tight transition-opacity duration-150 lg:block ${
            sabitlendi ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <span className="block truncate text-sm font-semibold text-white/80">{kimlik}</span>
          {taraflar && <span className="block truncate text-[11px] font-normal text-white/55">{taraflar}</span>}
        </span>
      )}
    </div>
    </>
  );
}
