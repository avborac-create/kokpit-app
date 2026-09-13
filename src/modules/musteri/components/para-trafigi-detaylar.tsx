"use client";

import { useState } from "react";

// Kaynak/Dosya/Grup gunluk kullanimda pek degismeyen, "ileri duzey"
// alanlardir - varsayilan olarak gizleyip formu Tarih/Tip/Tutar/Durum/
// Aciklama'ya indirgiyoruz (bkz. kullanicinin "karmasik" geri bildirimi).
// Duzenleme modunda ya da bu alanlardan biri zaten doluysa acik baslar,
// boylece mevcut bir secim gozden kaybolmaz.
export function ParaTrafigiDetaylar({
  children,
  varsayilanAcikMi = false,
}: {
  children: React.ReactNode;
  varsayilanAcikMi?: boolean;
}) {
  const [acik, setAcik] = useState(varsayilanAcikMi);

  return (
    <div className="col-span-2 md:col-span-4">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        className="mb-2 text-xs text-white/45 hover:text-[#6db8ff]"
      >
        {acik ? "− Detaylar (kaynak, dosya, grup)" : "+ Detaylar (kaynak, dosya, grup)"}
      </button>
      <div className={acik ? "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4" : "hidden"}>
        {children}
      </div>
    </div>
  );
}
