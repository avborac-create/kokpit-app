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
  bolum = "hepsi",
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
  // "tur": Tür + Yargı Kolu; "sifat": Müvekkil Sıfatı; ikisi ayri kartlarda gösterilir.
  bolum?: "tur" | "sifat" | "hepsi";
}) {
  const [turId, setTurId] = useState(varsayilanTurId);
  const davaMi = turler.find((t) => t.id === turId)?.kod === "dava_dosyasi";
  const icraMi = turler.find((t) => t.id === turId)?.kod === "icra_dosyasi";

  const turGoster = bolum !== "sifat";
  const sifatGoster = bolum !== "tur";

  return (
    <>
      {turGoster && (
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
      </>
      )}
      {sifatGoster && (
      <UyusmazlikTuruSecici
        key={icraMi ? "icra" : "diger"}
        etiket="Müvekkil Sıfatı"
        // "Borçlu" yalnizca icra dosyasinda secilebilir (icra/takip terimidir).
        turler={!icraMi ? sifatlar.filter((s) => s.kod !== "borclu") : sifatlar}
        varsayilanId={!icraMi && sifatlar.find((s) => s.id === varsayilanSifatId)?.kod === "borclu" ? "" : varsayilanSifatId}
        varsayilanYeniEtiket={varsayilanYeniSifatEtiketi}
        alanAdi="muvekkilSifatiId"
        yeniAlanAdi="yeniMuvekkilSifatiEtiketi"
        listeAnahtari="muvekkil_sifati"
        zorunlu
        yoneticiMi={yoneticiMi}
      />
      )}
    </>
  );
}
