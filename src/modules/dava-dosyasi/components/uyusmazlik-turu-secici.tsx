"use client";

import { useState } from "react";
import Link from "next/link";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";

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
}: {
  turler: { id: string; etiket: string }[];
  varsayilanId: string;
  varsayilanYeniEtiket?: string;
}) {
  const [secim, setSecim] = useState(varsayilanId);
  const manuelMi = secim === MANUEL_UYUSMAZLIK_DEGERI;

  return (
    <Alan>
      <div className="flex items-center justify-between">
        <Etiket htmlFor="hukukiIliskiTuruId">Uyuşmazlık Türü</Etiket>
        <Link
          href="/kokpit/ayarlar/secenekler"
          target="_blank"
          className="text-xs text-[#6db8ff] hover:underline"
        >
          Listeyi düzenle ↗
        </Link>
      </div>
      <Secim
        id="hukukiIliskiTuruId"
        name="hukukiIliskiTuruId"
        value={secim}
        onChange={(e) => setSecim(e.target.value)}
      >
        <option value="">Seçiniz…</option>
        <option value={MANUEL_UYUSMAZLIK_DEGERI}>＋ MANUEL GİR (listede yok)</option>
        {turler.map((t) => (
          <option key={t.id} value={t.id}>
            {t.etiket}
          </option>
        ))}
      </Secim>
      {manuelMi && (
        <Girdi
          name="yeniHukukiIliskiTuruEtiketi"
          defaultValue={varsayilanYeniEtiket}
          placeholder="Uyuşmazlık türünü yazın (listeye de eklenir)"
          required
          autoFocus
          className="mt-2"
        />
      )}
    </Alan>
  );
}
