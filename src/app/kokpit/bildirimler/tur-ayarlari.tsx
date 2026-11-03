"use client";

import { useState, useTransition } from "react";
import { bildirimTuruDegistir } from "@/core/bildirim/actions";

// Kullanıcının hangi bildirim türlerini almak istediği (kapalı olanlar gönderilmez).
export function TurAyarlari({ turler, kapali }: { turler: { kod: string; ad: string; aciklama: string }[]; kapali: string[] }) {
  const [kapaliListe, setKapali] = useState(kapali);
  const [hata, setHata] = useState("");
  const [, baslat] = useTransition();
  function degistir(kod: string) {
    const kapatilacak = !kapaliListe.includes(kod);
    const onceki = kapaliListe;
    setKapali(kapatilacak ? [...onceki, kod] : onceki.filter((k) => k !== kod));
    setHata("");
    baslat(async () => {
      try {
        await bildirimTuruDegistir(kod, kapatilacak);
      } catch (e) {
        setKapali(onceki);
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      }
    });
  }
  return (
    <div className="glass mt-6 rounded-2xl p-4">
      <h2 className="mb-1 text-sm font-semibold text-white">Hangi bildirimleri almak istiyorsunuz?</h2>
      <p className="mb-3 text-xs text-white/50">İşareti kaldırdığınız türden bildirim gelmez.</p>
      {turler.map((t) => (
        <label key={t.kod} className="flex cursor-pointer items-start gap-3 border-t border-white/[0.06] py-2.5 first:border-t-0">
          <input type="checkbox" className="onay-kutusu mt-0.5" checked={!kapaliListe.includes(t.kod)} onChange={() => degistir(t.kod)} />
          <span>
            <span className="block text-sm text-white">{t.ad}</span>
            <span className="block text-xs text-white/50">{t.aciklama}</span>
          </span>
        </label>
      ))}
      {hata && <p className="mt-2 text-xs text-red-300">{hata}</p>}
    </div>
  );
}
