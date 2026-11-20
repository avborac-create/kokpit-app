"use client";

import { useState, useTransition } from "react";
import { telefonErisimiIste } from "@/modules/musteri/lib/telefon-erisim-actions";

// Numara maskeliyken gosterilir: yoneticiden erisim ister; bekleyen talep varsa durumu soyler.
export function TelefonErisimDugmesi({ musteriId, bekliyor }: { musteriId: string; bekliyor: boolean }) {
  const [bekleyen, setBekleyen] = useState(bekliyor);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, basla] = useTransition();

  if (bekleyen) {
    return <span className="rounded-full bg-white/[0.07] px-3 py-1 text-xs text-white/70">Yönetici onayı bekleniyor…</span>;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={mesgul}
        onClick={() =>
          basla(async () => {
            try {
              await telefonErisimiIste(musteriId);
              setBekleyen(true);
            } catch (e) {
              setHata(e instanceof Error ? e.message : "Talep gönderilemedi.");
            }
          })
        }
        className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[#6db8ff] hover:underline disabled:opacity-50"
      >
        🔒 Erişim iste
      </button>
      {hata && <span className="text-xs text-[#ff7a70]">{hata}</span>}
    </span>
  );
}
