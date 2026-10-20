"use client";

import { useState } from "react";
import { Alan, Etiket, Secim } from "@/core/ui/form";
import { UyusmazlikTuruSecici } from "./uyusmazlik-turu-secici";

type Secenek = { id: string; etiket: string; kod: string };

// Dosyanin "Tür" (Dava / İcra / Arabuluculuk…), Dava ise "Yargı Kolu"
// (Hukuk / Ceza / İdari) ve "Müvekkil Sıfatı" (Alacaklı / Borçlu) secimi.
// Yargi kolu yalnizca Dava turunde sorulur.
export function DosyaSinifiAlanlari({
  turler,
  yargiKollari,
  varsayilanTurId,
  varsayilanYargiKoluId,
  sifatlar,
  varsayilanSifatId,
  varsayilanYeniSifatEtiketi,
  yoneticiMi,
}: {
  turler: Secenek[];
  yargiKollari: Secenek[];
  varsayilanTurId: string;
  varsayilanYargiKoluId: string;
  // Muvekkil sifati: admin tarafindan yerinde duzenlenebilen liste (muvekkil_sifati).
  sifatlar: Secenek[];
  varsayilanSifatId: string;
  varsayilanYeniSifatEtiketi?: string;
  yoneticiMi: boolean;
}) {
  const [turId, setTurId] = useState(varsayilanTurId);
  const davaMi = turler.find((t) => t.id === turId)?.kod === "dava_dosyasi";

  return (
    <>
      <Alan>
        <Etiket htmlFor="turId">Tür</Etiket>
        <Secim id="turId" name="turId" value={turId} onChange={(e) => setTurId(e.target.value)}>
          {turler.map((t) => (
            <option key={t.id} value={t.id}>
              {t.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      {davaMi && (
        <Alan>
          <Etiket htmlFor="yargiKoluId">Yargı Kolu</Etiket>
          <Secim id="yargiKoluId" name="yargiKoluId" defaultValue={varsayilanYargiKoluId}>
            <option value="">Seçiniz…</option>
            {yargiKollari.map((y) => (
              <option key={y.id} value={y.id}>
                {y.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
      )}
      <UyusmazlikTuruSecici
        etiket="Müvekkil Sıfatı"
        turler={sifatlar}
        varsayilanId={varsayilanSifatId}
        varsayilanYeniEtiket={varsayilanYeniSifatEtiketi}
        alanAdi="muvekkilSifatiId"
        yeniAlanAdi="yeniMuvekkilSifatiEtiketi"
        listeAnahtari="muvekkil_sifati"
        zorunlu
        yoneticiMi={yoneticiMi}
      />
    </>
  );
}
