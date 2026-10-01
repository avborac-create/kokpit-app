"use client";

import { useState } from "react";
import { Alan, Etiket, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";

type Tur = { id: string; etiket: string; maktuTutar: number | null };

// Tur secimi ile Tutar alanini birlikte yonetir: bir turun tanimli maktu
// tutari varsa (orn. "Basvuru Harci" - bkz. Ayarlar > Seçenek Listeleri)
// kullanici "Maktu Tutar Kullan" ile Tutar alanini o degerle otomatik
// doldurup salt-okunur yapabilir; istemezse elle girmeye devam eder.
export function MasrafTuruTutarAlani({
  turler,
  defaultTurId,
  defaultTutar,
}: {
  turler: Tur[];
  defaultTurId?: string;
  defaultTutar?: number;
}) {
  const [turId, setTurId] = useState(defaultTurId ?? "");
  const [maktuKullan, setMaktuKullan] = useState(false);

  const seciliTur = turler.find((tur) => tur.id === turId);
  const maktuTutarVarMi = seciliTur?.maktuTutar != null;

  return (
    <>
      <Alan>
        <Etiket htmlFor="turId">Tür</Etiket>
        <Secim
          id="turId"
          name="turId"
          required
          value={turId}
          onChange={(e) => {
            setTurId(e.target.value);
            setMaktuKullan(false);
          }}
        >
          <option value="" disabled>
            Seçiniz…
          </option>
          {turler.map((tur) => (
            <option key={tur.id} value={tur.id}>
              {tur.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label htmlFor="tutar" className="text-sm font-medium text-white/70">
            Tutar
          </label>
          {maktuTutarVarMi && (
            <label className="flex items-center gap-1.5 text-xs text-white/50">
              <input
                type="checkbox"
                checked={maktuKullan}
                onChange={(e) => setMaktuKullan(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              Maktu Tutar Kullan
            </label>
          )}
        </div>
        <ParaGirdisi
          key={maktuKullan ? `maktu-${turId}` : `serbest-${turId}`}
          id="tutar"
          name="tutar"
          required
          readOnly={maktuKullan}
          defaultValue={maktuKullan ? (seciliTur?.maktuTutar ?? undefined) : defaultTutar}
        />
      </Alan>
    </>
  );
}
