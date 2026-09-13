"use client";

import { useState } from "react";

// Durum/Birim/Uyusmazlik Grubu/Baglantili Dosya/Tarihler/Sorumlu Avukat/
// Aciklama gunluk kullanimda nadiren ilk elden gerekli olan alanlardir -
// varsayilan olarak gizleyip formu temel veriye (karsi taraf, hukuki
// iliski turu, dosya turu, dosya no, konu) indirgiyoruz. Duzenleme
// modunda ya da bu alanlardan biri zaten doluysa acik baslar.
export function DosyaDetaylar({
  children,
  varsayilanAcikMi = false,
}: {
  children: React.ReactNode;
  varsayilanAcikMi?: boolean;
}) {
  const [acik, setAcik] = useState(varsayilanAcikMi);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        className="mb-2 text-xs text-white/45 hover:text-[#6db8ff]"
      >
        {acik
          ? "− Detaylar (durum, grup, birim, tarih, avukat, açıklama)"
          : "+ Detaylar (durum, grup, birim, tarih, avukat, açıklama)"}
      </button>
      <div className={acik ? "" : "hidden"}>{children}</div>
    </div>
  );
}
