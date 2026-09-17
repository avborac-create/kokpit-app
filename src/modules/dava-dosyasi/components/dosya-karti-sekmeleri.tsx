"use client";

import { useState, type ReactNode } from "react";

export type DosyaKartiSekmesi = {
  id: string;
  baslik: string;
  icerik: ReactNode;
};

// Dosya karti (dava dosyasi detay sayfasi) icin minimal sekme (tab)
// bileseni - bkz. GELISTIRME_KUTUSU/AGENTS talebi "UYAP'taki gibi
// sekmeli bir dosya karti". Icerik server component'te ONCEDEN render
// edilip children/ReactNode olarak buraya gecirilir; bu bilesen sadece
// hangi sekmenin gorunur oldugunu tutar (baska bir sekme deseni yok,
// bu yuzden yeniden kullanilabilir bir cekirdek bilesen yapilmadi -
// tek kullanim yeri burasi).
export function DosyaKartiSekmeleri({ sekmeler }: { sekmeler: DosyaKartiSekmesi[] }) {
  const [aktifId, setAktifId] = useState(sekmeler[0]?.id);

  return (
    <div>
      <div className="glass mb-6 inline-flex gap-1 rounded-full p-1">
        {sekmeler.map((sekme) => (
          <button
            key={sekme.id}
            type="button"
            onClick={() => setAktifId(sekme.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              aktifId === sekme.id ? "bg-[var(--accent)] text-white" : "text-white/60 hover:text-white/85"
            }`}
          >
            {sekme.baslik}
          </button>
        ))}
      </div>
      {sekmeler.map((sekme) => (
        <div key={sekme.id} className={aktifId === sekme.id ? "block" : "hidden"}>
          {sekme.icerik}
        </div>
      ))}
    </div>
  );
}
