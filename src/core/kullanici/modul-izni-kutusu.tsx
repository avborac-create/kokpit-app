"use client";

import { useState, useTransition } from "react";
import { modulIzniDegistir } from "./admin-actions";

// Kullanıcı panelinde modül izni: Yönetici dışındaki kişiye Finans gibi menüleri ayrıca açar.
export function ModulIzniKutusu({
  id,
  moduller,
  izinli,
  yonetici,
  degistirebilir,
}: {
  id: string;
  moduller: { anahtar: string; ad: string }[];
  izinli: string[];
  yonetici: boolean;
  degistirebilir: boolean;
}) {
  const [hata, setHata] = useState("");
  const [bekliyor, baslat] = useTransition();
  if (yonetici) return <span className="text-white/45">Tümü (Yönetici)</span>;
  return (
    <div className="min-w-[8rem]">
      {moduller.map((m) => {
        const acik = izinli.includes(m.anahtar);
        return (
          <label key={m.anahtar} className="flex items-center gap-2 text-white/80">
            <input
              type="checkbox"
              className="onay-kutusu"
              checked={acik}
              disabled={!degistirebilir || bekliyor}
              onChange={() =>
                baslat(async () => {
                  setHata("");
                  try {
                    await modulIzniDegistir(id, m.anahtar, !acik);
                  } catch (e) {
                    setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
                  }
                })
              }
            />
            {m.ad}
          </label>
        );
      })}
      {hata && <p className="mt-1 text-xs text-red-300">{hata}</p>}
    </div>
  );
}
