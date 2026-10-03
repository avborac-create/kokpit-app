"use client";

import { useState, useTransition } from "react";
import { secenekDegeriEtiketGuncelle } from "@/core/secenek/admin-actions";
import { Dugme } from "@/core/ui/button";
import { Girdi } from "@/core/ui/form";

type Secenek = { id: string; etiket: string };

// Admin'e ozel, acilir listenin altinda satir ici (yerinde) duzeltme paneli.
// Native <select> icine buton konamadigi ve mobilde uzun basma/sag tik
// olmadigi icin "Seçenekleri düzenle" butonuyla acilir; hem dokunmatik hem
// masaustunde ayni calisir. Bu bir <form> DEGILDIR (ana dosya formunun icinde
// yer aldigi icin ic ice form olmaz) - inputlarda `name` yok, Enter da ana
// formu gondermesin diye yakalanir. Yetki sunucuda secenekDegeriEtiketGuncelle
// icinde ayrica denetlenir; burada sadece arayuz gizlenir.
export function SecenekYerindeDuzenle({
  secenekler,
  etiketDegisti,
}: {
  secenekler: Secenek[];
  // Kaydedilen etiketi ust bilesene bildirir, boylece acilir liste sayfa
  // yenilenmeden yeni adi gosterir.
  etiketDegisti: (id: string, etiket: string) => void;
}) {
  const [acik, setAcik] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        className="text-xs text-[#6db8ff] hover:underline"
        aria-expanded={acik}
      >
        {acik ? "Düzenlemeyi kapat ▲" : "Seçenekleri düzenle ▼"}
      </button>
      {acik && (
        <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
          {secenekler.length === 0 && <p className="text-xs text-white/40">Düzenlenecek seçenek yok.</p>}
          {secenekler.map((s) => (
            <SecenekSatiri key={s.id} secenek={s} etiketDegisti={etiketDegisti} />
          ))}
          <p className="text-[11px] text-white/35">
            Ad değişikliği bu seçeneği kullanan tüm dosyalarda görünür.
          </p>
        </div>
      )}
    </div>
  );
}

function SecenekSatiri({
  secenek,
  etiketDegisti,
}: {
  secenek: Secenek;
  etiketDegisti: (id: string, etiket: string) => void;
}) {
  const [deger, setDeger] = useState(secenek.etiket);
  const [hata, setHata] = useState("");
  const [kaydedildi, setKaydedildi] = useState(false);
  const [bekliyor, basla] = useTransition();
  const degisti = deger.trim() !== secenek.etiket && deger.trim() !== "";

  function kaydet() {
    if (!degisti || bekliyor) return;
    const fd = new FormData();
    fd.set("etiket", deger.trim());
    setHata("");
    basla(async () => {
      try {
        await secenekDegeriEtiketGuncelle(secenek.id, fd);
        etiketDegisti(secenek.id, deger.trim());
        setKaydedildi(true);
        setTimeout(() => setKaydedildi(false), 1500);
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Girdi
          value={deger}
          onChange={(e) => {
            setDeger(e.target.value);
            setKaydedildi(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              kaydet();
            }
          }}
          aria-label={`${secenek.etiket} adı`}
          className="!py-1.5"
        />
        <Dugme
          type="button"
          onClick={kaydet}
          disabled={!degisti || bekliyor}
          className="shrink-0 !px-3 !py-1.5 text-xs"
        >
          {kaydedildi ? "Kaydedildi ✓" : bekliyor ? "…" : "Kaydet"}
        </Dugme>
      </div>
      {hata && <p className="mt-1 text-xs text-[#ff7a70]">{hata}</p>}
    </div>
  );
}
