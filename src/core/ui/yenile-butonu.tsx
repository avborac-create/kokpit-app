"use client";

import { useState } from "react";

// Ana ekrana eklenmis (standalone) uygulamada "asagi cekip yenile" yoktur;
// bu dugme sayfayi bastan yukler, boylece yeni yayinlanan surum da gelir.
export function YenileButonu() {
  const [yukleniyor, setYukleniyor] = useState(false);
  return (
    <button
      type="button"
      aria-label="Sayfayı yenile"
      title="Sayfayı yenile"
      onClick={() => {
        setYukleniyor(true);
        window.location.reload();
      }}
      className="glass inline-flex h-8 w-8 items-center justify-center rounded-full text-white/85 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[var(--accent)] max-md:!border-0 max-md:!bg-transparent max-md:!shadow-none max-md:![backdrop-filter:none] md:h-9 md:w-9"
    >
      <svg viewBox="0 0 24 24" className={`h-[18px] w-[18px] ${yukleniyor ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5" />
      </svg>
    </button>
  );
}
