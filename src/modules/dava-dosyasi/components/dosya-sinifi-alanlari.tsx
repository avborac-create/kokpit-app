"use client";

import { useState } from "react";
import { Alan, Etiket, Secim } from "@/core/ui/form";

type Secenek = { id: string; etiket: string; kod: string };

// Dosyanin "Tür" (Dava / İcra / Arabuluculuk…), Dava ise "Yargı Kolu"
// (Hukuk / Ceza / İdari) ve "Müvekkil Sıfatı" (Alacaklı / Borçlu) secimi.
// Yargi kolu yalnizca Dava turunde sorulur.
export function DosyaSinifiAlanlari({
  turler,
  yargiKollari,
  varsayilanTurId,
  varsayilanYargiKoluId,
  varsayilanSifat,
}: {
  turler: Secenek[];
  yargiKollari: Secenek[];
  varsayilanTurId: string;
  varsayilanYargiKoluId: string;
  varsayilanSifat: "ALACAKLI" | "BORCLU";
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
      <Alan>
        <Etiket htmlFor="muvekkilSifati">Müvekkil Sıfatı</Etiket>
        <Secim id="muvekkilSifati" name="muvekkilSifati" defaultValue={varsayilanSifat}>
          <option value="ALACAKLI">Alacaklı</option>
          <option value="BORCLU">Borçlu</option>
        </Secim>
      </Alan>
    </>
  );
}
