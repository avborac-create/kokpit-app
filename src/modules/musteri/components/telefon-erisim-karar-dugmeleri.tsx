"use client";

import { useState, useTransition } from "react";
import { telefonErisimKarari, telefonErisiminiKapat } from "@/modules/musteri/lib/telefon-erisim-actions";

export function TelefonErisimKararDugmeleri({ talepId, tur }: { talepId: string; tur: "karar" | "kapat" }) {
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, basla] = useTransition();
  const calistir = (is: () => Promise<void>) =>
    basla(async () => {
      try {
        await is();
      } catch (e) {
        setHata(e instanceof Error ? e.message : "İşlem yapılamadı.");
      }
    });

  return (
    <span className="inline-flex items-center gap-2">
      {tur === "karar" ? (
        <>
          <button type="button" disabled={mesgul} onClick={() => calistir(() => telefonErisimKarari(talepId, true))} className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
            Onayla (24 saat)
          </button>
          <button type="button" disabled={mesgul} onClick={() => calistir(() => telefonErisimKarari(talepId, false))} className="rounded-full px-3 py-1 text-xs text-[#ff7a70] hover:bg-[#ff7a70]/10 disabled:opacity-50">
            Reddet
          </button>
        </>
      ) : (
        <button type="button" disabled={mesgul} onClick={() => calistir(() => telefonErisiminiKapat(talepId))} className="rounded-full px-3 py-1 text-xs text-[#ff7a70] hover:bg-[#ff7a70]/10 disabled:opacity-50">
          Erişimi kapat
        </button>
      )}
      {hata && <span className="text-xs text-[#ff7a70]">{hata}</span>}
    </span>
  );
}
