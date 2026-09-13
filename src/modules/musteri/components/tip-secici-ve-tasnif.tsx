"use client";

import { useState } from "react";
import { Alan, Etiket, Secim } from "@/core/ui/form";
import { TasnifGirisi } from "@/modules/musteri/components/tasnif-girisi";

type Tip = { id: string; kod: string; etiket: string };
type CariKod = { id: string; etiket: string };

// Tip = tasnifin baskin turunu dogrudan ifade eder (bkz. ARCHITECTURE.md).
// "Karma" secilmedigi surece tasnif alanlarini gostermeye gerek yok -
// sunucu tarafi tutarin tamamini secilen tipe karsilik gelen tek cari koda
// otomatik yazar (bkz. paraTrafigiKaydiEkle).
export function TipSeciciVeTasnif({
  tipler,
  cariKodlar,
  varsayilanTipId = "",
  varsayilanTasnif = {},
}: {
  tipler: Tip[];
  cariKodlar: CariKod[];
  varsayilanTipId?: string;
  varsayilanTasnif?: Record<string, number>;
}) {
  const [tipId, setTipId] = useState(varsayilanTipId);
  const secilenTip = tipler.find((t) => t.id === tipId);
  const karmaMi = secilenTip?.kod === "karma";

  return (
    <>
      <Alan>
        <Etiket htmlFor="tipId">Tip</Etiket>
        <Secim
          id="tipId"
          name="tipId"
          required
          value={tipId}
          onChange={(e) => setTipId(e.target.value)}
        >
          <option value="" disabled>
            Seçiniz…
          </option>
          {tipler.map((tip) => (
            <option key={tip.id} value={tip.id}>
              {tip.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      {karmaMi && <TasnifGirisi cariKodlar={cariKodlar} varsayilanDegerler={varsayilanTasnif} />}
    </>
  );
}
