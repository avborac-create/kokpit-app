"use client";

import { useState } from "react";
import { Alan, Etiket, Secim } from "@/core/ui/form";
import { SecenekDuzenleyici } from "./secenek-duzenleyici";
import { UyusmazlikTuruSecici } from "./uyusmazlik-turu-secici";

type Secenek = { id: string; etiket: string; ustId?: string | null };

// Icerik siniflandirmasi: Hukuk Dali (ortak filtre) > Dava Turu (usul
// bakimindan: itirazin iptali, tespit...) > Dava Konusu (maddi hak: fatura
// alacagi...). Secilen dal iki kutuyu da suzer ve forma hem tur hem konu icin
// ayri alan olarak yazilir (davaTuruUstId / hukukiIliskiTuruUstId).
export function IcerikSiniflandirma({
  hukukDallari,
  davaTurleri,
  hukukiIliskiTurleri,
  varsayilanDavaTuruId,
  varsayilanKonuId,
  varsayilanYeniTurEtiketi,
  varsayilanYeniKonuEtiketi,
  turGoster,
  konuGoster,
  etiketler,
  yoneticiMi,
}: {
  hukukDallari: { id: string; etiket: string }[];
  davaTurleri: Secenek[];
  hukukiIliskiTurleri: Secenek[];
  varsayilanDavaTuruId: string;
  varsayilanKonuId: string;
  varsayilanYeniTurEtiketi?: string;
  varsayilanYeniKonuEtiketi?: string;
  turGoster: boolean;
  konuGoster: boolean;
  etiketler: { tur: string; konu: string };
  yoneticiMi: boolean;
}) {
  const [dalId, setDalId] = useState(
    hukukiIliskiTurleri.find((t) => t.id === varsayilanKonuId)?.ustId ??
      davaTurleri.find((t) => t.id === varsayilanDavaTuruId)?.ustId ??
      "",
  );

  return (
    <>
      <Alan>
        <Etiket htmlFor="icerikHukukDali">Hukuk Dalı</Etiket>
        <Secim id="icerikHukukDali" value={dalId} onChange={(e) => setDalId(e.target.value)} aria-label="Hukuk Dalı">
          <option value="">Hukuk dalı — Diğer / belirtilmiyor</option>
          {hukukDallari.map((d) => (
            <option key={d.id} value={d.id}>
              {d.etiket}
            </option>
          ))}
        </Secim>
        {yoneticiMi && (
          <SecenekDuzenleyici listeAnahtari="hukuk_dali" secenekler={hukukDallari} baslik="Hukuk dallarını düzenle" />
        )}
      </Alan>
      {turGoster && (
        <UyusmazlikTuruSecici
          etiket={etiketler.tur}
          dallar={hukukDallari}
          dalId={dalId}
          dalAlanAdi="davaTuruUstId"
          turler={davaTurleri}
          varsayilanId={varsayilanDavaTuruId}
          varsayilanYeniEtiket={varsayilanYeniTurEtiketi}
          alanAdi="davaTuruId"
          yeniAlanAdi="yeniDavaTuruEtiketi"
          yoneticiMi={yoneticiMi}
        />
      )}
      {konuGoster && (
        <UyusmazlikTuruSecici
          etiket={etiketler.konu}
          dallar={hukukDallari}
          dalId={dalId}
          dalAlanAdi="hukukiIliskiTuruUstId"
          turler={hukukiIliskiTurleri}
          varsayilanId={varsayilanKonuId}
          varsayilanYeniEtiket={varsayilanYeniKonuEtiketi}
          yoneticiMi={yoneticiMi}
        />
      )}
    </>
  );
}
