"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { odakDegistir } from "./actions";

// Tek tikla goreve odaklanir / odaktan cikarir. Kucuk (liste, kart) ve genis (detay) gorunumu vardir.
export function OdakDugmesi({ isId, odakta, genis = false }: { isId: string; odakta: boolean; genis?: boolean }) {
  const yonlendirici = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState("");
  return (
    <>
      <button
        type="button"
        disabled={bekliyor}
        title={odakta ? "Odak kutusundan çıkar" : "Odaklan: odak kutuma ekle"}
        onClick={() =>
          basla(async () => {
            const s = await odakDegistir(isId);
            setHata(s.hata ?? "");
            yonlendirici.refresh();
          })
        }
        className={`${genis ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs"} shrink-0 rounded-full border font-semibold disabled:opacity-50 ${odakta ? "border-[#f2b04c] bg-[#f2b04c]/25 text-[#f2b04c]" : "border-white/20 text-white/65 hover:bg-white/10"}`}
      >
        🎯 {odakta ? "Odakta" : "Odaklan"}
      </button>
      {hata && <span className="text-xs text-red-300">{hata}</span>}
    </>
  );
}
