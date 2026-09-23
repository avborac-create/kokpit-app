"use client";

import { useState } from "react";
import { Etiket, Girdi } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";

// Talep Sonucu tek bir serbest metin degil, davada istenen her kalemin
// (ör. "170.000 TL kıdem tazminatı", "... hususunun tespiti") AYRI bir
// madde olarak eklenip cikarilabildigi bir liste - KarsiTarafEkleyici'deki
// "yaz + Ekle" akisindan farkli olarak burada her madde DOGRUDAN
// duzenlenebilir bir metin kutusu (kaldirilamayan tekil bir kayit degil,
// serbestce yeniden yazilabilir). Sunucu tarafinda tum maddeler "\n" ile
// birlestirilip mevcut `talepSonucu` sutununa yazilir (bkz. actions.ts) -
// ayri bir tablo/migration gerektirmez.
export function TalepSonucuListesi({ baslangicMaddeler = [] }: { baslangicMaddeler?: string[] }) {
  const [maddeler, setMaddeler] = useState<string[]>(
    baslangicMaddeler.length > 0 ? baslangicMaddeler : [""],
  );

  function guncelle(index: number, deger: string) {
    setMaddeler((liste) => liste.map((m, i) => (i === index ? deger : m)));
  }

  function ekle() {
    setMaddeler((liste) => [...liste, ""]);
  }

  function kaldir(index: number) {
    setMaddeler((liste) => (liste.length > 1 ? liste.filter((_, i) => i !== index) : [""]));
  }

  return (
    <div className="mb-4">
      <Etiket>Talep Sonucu</Etiket>
      <div className="flex flex-col gap-2">
        {maddeler.map((madde, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-sm text-white/35">{index + 1}.</span>
            <Girdi
              name="talepMaddeleri"
              value={madde}
              onChange={(e) => guncelle(index, e.target.value)}
              placeholder="ör. 170.000 TL kıdem tazminatı"
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => kaldir(index)}
              className="shrink-0 text-white/40 hover:text-[#ff7a70]"
              aria-label={`${index + 1}. maddeyi kaldır`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <Dugme type="button" varyant="ikincil" className="mt-2" onClick={ekle}>
        + Madde Ekle
      </Dugme>
    </div>
  );
}
