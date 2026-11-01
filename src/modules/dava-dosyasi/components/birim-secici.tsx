"use client";

import { useState, useTransition } from "react";
import { Secim, Girdi } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import { adliBirimEkle } from "../lib/adli-birim";
import { ADLIYELER, BIRIM_TURLERI, birimAdiOlustur } from "../lib/adli-birim-sabitleri";

// Mahkeme/icra dairesi adi yazilmaz, katalogdan secilir. Katalogda yoksa
// adliye + tur + sira numarasi secilerek eklenir; ad UYAP yazimiyla sistem kurar.
export function BirimSecici({ birimler, varsayilan }: { birimler: string[]; varsayilan: string }) {
  const [liste, setListe] = useState(birimler);
  const [secili, setSecili] = useState(varsayilan);
  const [acik, setAcik] = useState(false);
  const [adliye, setAdliye] = useState("");
  const [tur, setTur] = useState("");
  const [sira, setSira] = useState("");
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();

  const turBilgisi = BIRIM_TURLERI.find((t) => t.ad === tur);
  const onizleme =
    adliye && tur && (!turBilgisi?.numarali || /^\d{1,3}$/.test(sira))
      ? birimAdiOlustur(adliye, tur, turBilgisi?.numarali ? Number(sira) : null)
      : "";
  const eskiDeger = secili && !liste.includes(secili);

  function ekle() {
    setHata("");
    basla(async () => {
      const sonuc = await adliBirimEkle(adliye, tur, sira);
      if ("hata" in sonuc) {
        setHata(sonuc.hata);
        return;
      }
      setListe((onceki) => (onceki.includes(sonuc.ad) ? onceki : [...onceki, sonuc.ad].sort((a, b) => a.localeCompare(b, "tr"))));
      setSecili(sonuc.ad);
      setAcik(false);
      setAdliye("");
      setTur("");
      setSira("");
    });
  }

  return (
    <div className="space-y-2">
      <Secim id="birimAdi" name="birimAdi" value={secili} onChange={(e) => setSecili(e.target.value)}>
        <option value="">Birim seçin…</option>
        {eskiDeger && <option value={secili}>{secili} (katalogda yok, değiştirin)</option>}
        {liste.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </Secim>
      {!acik ? (
        <button type="button" onClick={() => setAcik(true)} className="text-sm text-[var(--link)] hover:underline">
          + Yeni birim ekle
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <Secim value={adliye} onChange={(e) => setAdliye(e.target.value)} aria-label="Adliye">
            <option value="">Adliye seçin…</option>
            {ADLIYELER.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Secim>
          <Secim value={tur} onChange={(e) => setTur(e.target.value)} aria-label="Birim türü">
            <option value="">Birim türü seçin…</option>
            {BIRIM_TURLERI.map((t) => (
              <option key={t.ad} value={t.ad}>
                {t.ad}
              </option>
            ))}
          </Secim>
          {turBilgisi?.numarali && (
            <Girdi
              inputMode="numeric"
              placeholder="Sıra numarası (ör. 19) - numarasızsa boş bırakın"
              aria-label="Sıra numarası"
              value={sira}
              onChange={(e) => setSira(e.target.value.replace(/\D/g, "").slice(0, 3))}
            />
          )}
          {onizleme && (
            <p className="text-sm text-white/70">
              Eklenecek ad: <b className="text-white">{onizleme}</b>
            </p>
          )}
          {hata && <p className="text-xs text-[#ff7a70]">{hata}</p>}
          <div className="flex gap-2">
            <Dugme type="button" onClick={ekle} disabled={!onizleme || bekliyor}>
              {bekliyor ? "Ekleniyor…" : "Ekle ve seç"}
            </Dugme>
            <Dugme type="button" varyant="ikincil" onClick={() => setAcik(false)}>
              Vazgeç
            </Dugme>
          </div>
        </div>
      )}
    </div>
  );
}
