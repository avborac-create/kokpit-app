"use client";

import { useEffect, useState } from "react";
import { KISA_UNVAN_ONAY_METNI, KISA_UNVAN_UYARISI, unvanKisaMi } from "./unvan-kontrol";

// Form alanlarini (ad kutusu + opsiyonel tip secimi) dinler; ad kisa gorunuyorsa uyari ve
// "sonra tamamlayacagim" onay kutusunu gosterir. Onay yoksa sunucu kaydi reddeder.
export function KisaUnvanOnayi({ adAlaniId, tipAlaniId, tuzelTipIdleri = [] }: { adAlaniId: string; tipAlaniId?: string; tuzelTipIdleri?: string[] }) {
  const [kisa, setKisa] = useState(false);

  useEffect(() => {
    const ad = document.getElementById(adAlaniId) as HTMLInputElement | null;
    const tip = tipAlaniId ? (document.getElementById(tipAlaniId) as HTMLSelectElement | null) : null;
    const hesapla = () => setKisa(unvanKisaMi(ad?.value ?? "", tip ? tuzelTipIdleri.includes(tip.value) : false));
    hesapla();
    ad?.addEventListener("input", hesapla);
    tip?.addEventListener("change", hesapla);
    return () => {
      ad?.removeEventListener("input", hesapla);
      tip?.removeEventListener("change", hesapla);
    };
  }, [adAlaniId, tipAlaniId, tuzelTipIdleri]);

  if (!kisa) return null;
  return (
    <div className="rounded-xl border border-[#f2b04c]/40 bg-[#f2b04c]/10 p-3 text-sm text-[#f3d9a8]">
      <p>{KISA_UNVAN_UYARISI}</p>
      <label className="mt-2 flex items-start gap-2 text-white/85">
        <input type="checkbox" name="kisaUnvanOnayi" value="1" className="mt-1 h-4 w-4 accent-[#f2b04c]" />
        <span>{KISA_UNVAN_ONAY_METNI}</span>
      </label>
    </div>
  );
}
