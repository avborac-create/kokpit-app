"use client";

import { useState } from "react";

// Dosya kartı başlığında bakiye uyarılarını tek rozette toplar (masaüstü); tıklayınca ayrıntılar açılır.
// Mobilde ayrıntılar her zaman açık kalır.
export function BakiyeUyariOzeti({ ozet, ton, children }: { ozet: string; ton: "eksik" | "arti" | "notr"; children: React.ReactNode }) {
  const [acik, setAcik] = useState(false);
  const renk =
    ton === "eksik" ? "bg-[#ff7a70]/15 text-[#ff7a70]" : ton === "arti" ? "bg-[#32d74b]/15 text-[#32d74b]" : "bg-white/[0.08] text-white/85";
  return (
    <div className="flex max-w-full flex-col items-end gap-1.5 max-md:items-start">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
        className={`hidden whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium md:inline-flex ${renk}`}
      >
        {ozet} {acik ? "▴" : "▾"}
      </button>
      <div className={`flex-wrap justify-end gap-1.5 max-md:justify-start ${acik ? "flex" : "flex md:hidden"}`}>{children}</div>
    </div>
  );
}
