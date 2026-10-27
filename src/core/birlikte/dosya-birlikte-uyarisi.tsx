"use client";

import { useEffect, useState } from "react";
import { dosyaNabziAt } from "./actions";

const NABIZ_ARALIGI_MS = 20_000;

// "Şu an X bu dosyada" uyarısı. Sayfa görünürken ~20 sn'de bir nabız atar;
// sekme arka plandayken atmaz (orada olmayan kişi "dosyada" sayılmasın).
export function DosyaBirlikteUyarisi({ dosyaId }: { dosyaId: string }) {
  const [digerleri, setDigerleri] = useState<string[]>([]);

  useEffect(() => {
    let iptal = false;
    const nabizAt = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const adlar = await dosyaNabziAt(dosyaId);
        if (!iptal) setDigerleri((onceki) => (onceki.join("|") === adlar.join("|") ? onceki : adlar));
      } catch {
        // Ağ/oturum hatası uyarıyı bozmasın; bir sonraki nabızda yeniden denenir.
      }
    };
    void nabizAt();
    const zamanlayici = setInterval(nabizAt, NABIZ_ARALIGI_MS);
    document.addEventListener("visibilitychange", nabizAt);
    return () => {
      iptal = true;
      clearInterval(zamanlayici);
      document.removeEventListener("visibilitychange", nabizAt);
    };
  }, [dosyaId]);

  if (digerleri.length === 0) return null;
  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-[#ffb340]/30 bg-[#ffb340]/10 px-3 py-2 text-sm text-[#ffb340]"
    >
      Şu an <strong>{digerleri.join(", ")}</strong> bu dosyada. Aynı bilgiyi aynı anda değiştirirseniz
      kayıtlar çakışabilir.
    </div>
  );
}
