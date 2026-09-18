"use client";

import { useState } from "react";

// Hukuk Dosyasi formunun "sade 6 alan" disindaki eski/zengin alanlarini
// (Dosya Turu, Hukuki Iliski Turu, Dosya Kumesi, Bagli Oldugu Dosya,
// Sorumlu Avukat, Acilis/Kapanis Tarihi, Aciklama) varsayilan olarak
// gizleyen kapali bolum - bkz. plan "Gizlenecek eski alanlar". Ayni
// ParaTrafigiDetaylar deseni: alanlar DOM'dan hic kalkmaz (sadece CSS ile
// gizlenir), boylece duzenleme modunda mevcut degerleri form gonderiminde
// kaybolmaz.
export function DigerBilgilerAcici({
  children,
  varsayilanAcikMi = false,
}: {
  children: React.ReactNode;
  varsayilanAcikMi?: boolean;
}) {
  const [acik, setAcik] = useState(varsayilanAcikMi);

  return (
    <div className="mt-2 mb-4 border-t border-white/[0.06] pt-4">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        className="mb-3 text-xs text-white/45 hover:text-[#6db8ff]"
      >
        {acik ? "− Diğer Bilgiler" : "+ Diğer Bilgiler"}
      </button>
      <div className={acik ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "hidden"}>{children}</div>
    </div>
  );
}
