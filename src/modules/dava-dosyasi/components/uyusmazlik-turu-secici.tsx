"use client";

import { useState } from "react";
import Link from "next/link";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { SecenekYerindeDuzenle } from "./secenek-yerinde-duzenle";

export const MANUEL_UYUSMAZLIK_DEGERI = "__manuel__";

// Uyusmazlik turu secimi: liste + "Listede yok - elle gir" secenegi. Elle
// girilen etiket sunucuda (hukukiIliskiTuruIdCozumle, actions.ts) listeye
// KALICI olarak eklenir - bir sonraki dosyada hazir gelir. Listeyi toptan
// duzenlemek icin Ayarlar > Secenek Listeleri'ne baglanti verilir (native
// <select> icine buton konamadigi icin etiketin yaninda durur).
export function UyusmazlikTuruSecici({
  turler,
  varsayilanId,
  varsayilanYeniEtiket,
  alanAdi = "hukukiIliskiTuruId",
  yeniAlanAdi = "yeniHukukiIliskiTuruEtiketi",
  etiket = "Uyuşmazlık Türü",
  zorunlu = false,
  yoneticiMi = false,
}: {
  turler: { id: string; etiket: string }[];
  varsayilanId: string;
  varsayilanYeniEtiket?: string;
  alanAdi?: string;
  yeniAlanAdi?: string;
  etiket?: string;
  zorunlu?: boolean;
  // Sadece admin: yerinde ad duzeltme paneli + tam liste yonetimi baglantisi.
  yoneticiMi?: boolean;
}) {
  const [secim, setSecim] = useState(varsayilanId);
  const [etiketDuzeltmeleri, setEtiketDuzeltmeleri] = useState<Record<string, string>>({});
  const manuelMi = secim === MANUEL_UYUSMAZLIK_DEGERI;
  const guncelTurler = turler.map((t) => ({ ...t, etiket: etiketDuzeltmeleri[t.id] ?? t.etiket }));

  return (
    <Alan>
      <div className="flex items-center justify-between">
        <Etiket htmlFor={alanAdi}>{etiket}</Etiket>
        {yoneticiMi && (
          <Link
            href={`/kokpit/ayarlar/secenekler?liste=${alanAdi === "davaTuruId" ? "dava_turu" : "hukuki_iliski_turu"}`}
            target="_blank"
            className="text-xs text-[#6db8ff] hover:underline"
          >
            Tüm liste ↗
          </Link>
        )}
      </div>
      <Secim
        id={alanAdi}
        name={alanAdi}
        required={zorunlu}
        value={secim}
        onChange={(e) => setSecim(e.target.value)}
      >
        <option value="" disabled={zorunlu}>
          Seçiniz…
        </option>
        <option value={MANUEL_UYUSMAZLIK_DEGERI}>＋ MANUEL GİR (listede yok)</option>
        {guncelTurler.map((t) => (
          <option key={t.id} value={t.id}>
            {t.etiket}
          </option>
        ))}
      </Secim>
      {yoneticiMi && (
        <SecenekYerindeDuzenle
          secenekler={guncelTurler}
          etiketDegisti={(id, yeni) => setEtiketDuzeltmeleri((onceki) => ({ ...onceki, [id]: yeni }))}
        />
      )}
      {manuelMi && (
        <Girdi
          name={yeniAlanAdi}
          defaultValue={varsayilanYeniEtiket}
          placeholder={`${etiket} yazın (listeye de eklenir)`}
          required
          autoFocus
          className="mt-2"
        />
      )}
    </Alan>
  );
}
