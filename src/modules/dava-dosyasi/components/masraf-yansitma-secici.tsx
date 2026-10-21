"use client";

import { useState } from "react";
import { Alan, Etiket, Secim } from "@/core/ui/form";

type Hedef = "MUVEKKIL" | "BURO" | "BORCLU";

const SECENEKLER: { deger: Hedef; etiket: string }[] = [
  { deger: "MUVEKKIL", etiket: "Müvekkile" },
  { deger: "BURO", etiket: "Büroya" },
  { deger: "BORCLU", etiket: "Karşı Tarafa / Borçluya" },
];

// "Masraf kime yansitilsin?" secimi. Karsi Tarafa / Borcluya secilirse,
// dosyadaki karsi taraflar arasindan OPSIYONEL bir secim acilir.
export function MasrafYansitmaSecici({
  varsayilanHedef,
  karsiTaraflar,
  varsayilanKarsiTarafId,
}: {
  varsayilanHedef: Hedef;
  karsiTaraflar: { id: string; ad: string }[];
  varsayilanKarsiTarafId?: string | null;
}) {
  const [hedef, setHedef] = useState<Hedef>(varsayilanHedef);

  return (
    <div className="col-span-1 sm:col-span-2 md:col-span-4">
      <Etiket>Masraf Kime Yansıtılsın?</Etiket>
      <div className="flex flex-wrap gap-2">
        {SECENEKLER.map((secenek) => (
          <label key={secenek.deger} className="cursor-pointer">
            <input
              type="radio"
              name="yansitmaHedefi"
              value={secenek.deger}
              checked={hedef === secenek.deger}
              onChange={() => setHedef(secenek.deger)}
              className="peer sr-only"
            />
            <span className="block rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/60 transition-colors peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent-soft)] peer-checked:text-[#6db8ff] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)]">
              {secenek.etiket}
            </span>
          </label>
        ))}
      </div>
      {hedef === "BORCLU" && (
        <div className="mt-3 max-w-sm">
          <Alan>
            <Etiket htmlFor="karsiTarafId">Hangi Karşı Taraf? (opsiyonel)</Etiket>
            <Secim id="karsiTarafId" name="karsiTarafId" defaultValue={varsayilanKarsiTarafId ?? ""}>
              <option value="">Belirtilmedi</option>
              {karsiTaraflar.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad}
                </option>
              ))}
            </Secim>
          </Alan>
        </div>
      )}
      <p className="mt-1 text-xs text-white/35">
        Yalnızca &quot;Müvekkile&quot; yansıtılan masraflar müvekkil cari hesabından düşer. Büro ustlenirse ya da
        karşı taraftan/borçludan tahsil edilecekse müvekkil bakiyesini etkilemez.
      </p>
    </div>
  );
}
