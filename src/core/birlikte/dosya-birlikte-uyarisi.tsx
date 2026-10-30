"use client";

import { useEffect, useState } from "react";
import { dosyaNabziAt } from "./actions";

const NABIZ_ARALIGI_MS = 90_000;
// Bu kadar süre fare/klavye/dokunma olmazsa nabız durur (açık unutulmuş sekme
// veritabanı kotasını yemesin); kişi geri dönünce hemen yeniden başlar.
const BOSTA_SURESI_MS = 5 * 60_000;
const ETKINLIK_OLAYLARI = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

// "Şu an X bu dosyada" uyarısı. Sayfa görünürken ve kullanıcı etkinken ~90 sn'de
// bir nabız atar; sekme arka plandayken ya da kişi boştayken atmaz (orada
// olmayan kişi "dosyada" sayılmasın).
export function DosyaBirlikteUyarisi({ dosyaId }: { dosyaId: string }) {
  const [digerleri, setDigerleri] = useState<string[]>([]);

  useEffect(() => {
    let iptal = false;
    let sonEtkinlik = Date.now();
    let bostaydi = false;
    const nabizAt = async () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - sonEtkinlik > BOSTA_SURESI_MS) {
        bostaydi = true;
        return;
      }
      try {
        const adlar = await dosyaNabziAt(dosyaId);
        if (!iptal) setDigerleri((onceki) => (onceki.join("|") === adlar.join("|") ? onceki : adlar));
      } catch {
        // Ağ/oturum hatası uyarıyı bozmasın; bir sonraki nabızda yeniden denenir.
      }
    };
    const etkinlikOldu = () => {
      sonEtkinlik = Date.now();
      if (bostaydi) {
        bostaydi = false;
        void nabizAt();
      }
    };
    void nabizAt();
    const zamanlayici = setInterval(nabizAt, NABIZ_ARALIGI_MS);
    document.addEventListener("visibilitychange", nabizAt);
    for (const olay of ETKINLIK_OLAYLARI) window.addEventListener(olay, etkinlikOldu, { passive: true });
    return () => {
      iptal = true;
      clearInterval(zamanlayici);
      document.removeEventListener("visibilitychange", nabizAt);
      for (const olay of ETKINLIK_OLAYLARI) window.removeEventListener(olay, etkinlikOldu);
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
