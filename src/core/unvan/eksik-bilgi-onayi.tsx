"use client";

import { useEffect, useRef, useState } from "react";
import { EKSIK_BILGI_ONAY_METNI, eksikBilgiUyarisi, telefonBosMu } from "./eksik-bilgi-kontrol";

// Musteri formunda telefon rehberini (tel_no), eski telefon notunu ve adresi dinler;
// biri bossa uyari ve onay kutusunu gosterir. Onay yoksa sunucu kaydi reddeder.
export function EksikBilgiOnayi() {
  const kok = useRef<HTMLDivElement>(null);
  const [eksikler, setEksikler] = useState<string[]>([]);

  useEffect(() => {
    const form = kok.current?.closest("form");
    if (!form) return;
    const hesapla = () => {
      const alan = (ad: string) => Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[name="${ad}"]`));
      const telefonVar = [...alan("tel_no"), ...alan("telefon")].some((e) => !telefonBosMu(e.value));
      const adresVar = alan("adres").some((e) => e.value.trim() !== "");
      const yeni: string[] = [];
      if (!telefonVar) yeni.push("Telefon");
      if (!adresVar) yeni.push("Adres");
      setEksikler((onceki) => (onceki.join() === yeni.join() ? onceki : yeni));
    };
    hesapla();
    form.addEventListener("input", hesapla);
    form.addEventListener("change", hesapla);
    // Telefon satiri ekle/sil gibi islemler girdileri DOM'da degistirir.
    const gozlemci = new MutationObserver(hesapla);
    gozlemci.observe(form, { childList: true, subtree: true });
    return () => {
      form.removeEventListener("input", hesapla);
      form.removeEventListener("change", hesapla);
      gozlemci.disconnect();
    };
  }, []);

  return (
    <div ref={kok}>
      {eksikler.length > 0 && (
        <div className="mb-4 rounded-xl border border-[#f2b04c]/40 bg-[#f2b04c]/10 p-3 text-sm text-[#f3d9a8]">
          <p>{eksikBilgiUyarisi(eksikler)}</p>
          <label className="mt-2 flex items-start gap-2 text-white/85">
            <input type="checkbox" name="eksikBilgiOnayi" value="1" className="mt-1 h-4 w-4 accent-[#f2b04c]" />
            <span>{EKSIK_BILGI_ONAY_METNI}</span>
          </label>
        </div>
      )}
    </div>
  );
}
