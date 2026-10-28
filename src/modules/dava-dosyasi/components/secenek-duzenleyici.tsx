"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  secenekDegeriAktifligiDegistir,
  secenekDegeriEkleAnahtarla,
  secenekDegeriEtiketGuncelle,
  secenekDegeriSiraDegistir,
  secenekDegeriUstDegistir,
} from "@/core/secenek/admin-actions";
import { Dugme } from "@/core/ui/button";
import { Girdi, Secim } from "@/core/ui/form";

type Satir = { id: string; etiket: string; ustId?: string | null };

// Admin'e ozel, secim kutusunun altinda yerinde duzenleme paneli: ekleme,
// yeniden adlandirma, sirasini degistirme, kaldirma (gizleme) ve - konu
// listesinde - bagli oldugu hukuk dalini degistirme. Bu bir <form> DEGILDIR
// (ana dosya formunun icindedir); Enter ana formu gondermesin diye
// yakalanir. Yetki sunucuda ayrica denetlenir. "Kaldir" kaydi silmez, yalniz
// listelerden gizler: bu degeri kullanan eski dosyalar adini gostermeye devam
// eder. Her islemden sonra router.refresh() ile liste yenilenir (formdaki
// yazilmis alanlar bundan etkilenmez).
export function SecenekDuzenleyici({
  listeAnahtari,
  secenekler,
  dallar,
  baslik = "Seçenekleri düzenle",
}: {
  listeAnahtari: string;
  secenekler: Satir[];
  // Verilirse her satirda ve yeni eklemede hukuk dali secilebilir.
  dallar?: { id: string; etiket: string }[];
  baslik?: string;
}) {
  const [acik, setAcik] = useState(false);
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState("");
  const [yeniAd, setYeniAd] = useState("");
  const [yeniUstId, setYeniUstId] = useState("");
  const router = useRouter();

  function calistir(is: () => Promise<unknown>) {
    setHata("");
    basla(async () => {
      try {
        await is();
        router.refresh();
      } catch (e) {
        setHata(e instanceof Error ? e.message : "İşlem başarısız oldu.");
      }
    });
  }

  function ekle() {
    const ad = yeniAd.trim();
    if (!ad || bekliyor) return;
    calistir(async () => {
      await secenekDegeriEkleAnahtarla(listeAnahtari, ad, yeniUstId || null);
      setYeniAd("");
    });
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        className="text-xs text-[#6db8ff] hover:underline"
        aria-expanded={acik}
      >
        {acik ? "Düzenlemeyi kapat ▲" : `${baslik} ▼`}
      </button>
      {acik && (
        <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
          {secenekler.length === 0 && <p className="text-xs text-white/40">Henüz seçenek yok.</p>}
          {secenekler.map((s, i) => (
            <Satiri
              key={s.id}
              satir={s}
              ilkMi={i === 0}
              sonMu={i === secenekler.length - 1}
              dallar={dallar}
              bekliyor={bekliyor}
              calistir={calistir}
            />
          ))}
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
            <Girdi
              value={yeniAd}
              onChange={(e) => setYeniAd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ekle();
                }
              }}
              placeholder="Yeni seçenek adı"
              aria-label="Yeni seçenek adı"
              className="!w-auto min-w-[10rem] flex-1 !py-1.5"
            />
            {dallar && (
              <Secim
                value={yeniUstId}
                onChange={(e) => setYeniUstId(e.target.value)}
                aria-label="Hukuk dalı"
                className="!w-auto max-w-[11rem] !py-1.5"
              >
                <option value="">Dal yok (hepsinde)</option>
                {dallar.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.etiket}
                  </option>
                ))}
              </Secim>
            )}
            <Dugme type="button" onClick={ekle} disabled={!yeniAd.trim() || bekliyor} className="shrink-0 !px-3 !py-1.5 text-xs">
              + Ekle
            </Dugme>
          </div>
          {hata && <p className="text-xs text-[#ff7a70]">{hata}</p>}
          <p className="text-[11px] text-white/35">
            Ad değişikliği bu seçeneği kullanan tüm dosyalarda görünür. “Kaldır” seçeneği yalnız listeden gizler;
            eski dosyalar etkilenmez.
          </p>
        </div>
      )}
    </div>
  );
}

function Satiri({
  satir,
  ilkMi,
  sonMu,
  dallar,
  bekliyor,
  calistir,
}: {
  satir: Satir;
  ilkMi: boolean;
  sonMu: boolean;
  dallar?: { id: string; etiket: string }[];
  bekliyor: boolean;
  calistir: (is: () => Promise<unknown>) => void;
}) {
  const [deger, setDeger] = useState(satir.etiket);
  const degisti = deger.trim() !== satir.etiket && deger.trim() !== "";

  function kaydet() {
    if (!degisti || bekliyor) return;
    const fd = new FormData();
    fd.set("etiket", deger.trim());
    calistir(() => secenekDegeriEtiketGuncelle(satir.id, fd));
  }

  const kucukDugme =
    "shrink-0 rounded-md px-1.5 py-1 text-xs text-white/50 hover:text-white disabled:opacity-30 disabled:hover:text-white/50";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Girdi
        value={deger}
        onChange={(e) => setDeger(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            kaydet();
          }
        }}
        aria-label={`${satir.etiket} adı`}
        className="!w-auto min-w-[10rem] flex-1 !py-1.5"
      />
      {dallar && (
        <Secim
          value={satir.ustId ?? ""}
          onChange={(e) => calistir(() => secenekDegeriUstDegistir(satir.id, e.target.value || null))}
          aria-label={`${satir.etiket} hukuk dalı`}
          className="!w-auto max-w-[11rem] !py-1.5"
          disabled={bekliyor}
        >
          <option value="">Dal yok (hepsinde)</option>
          {dallar.map((d) => (
            <option key={d.id} value={d.id}>
              {d.etiket}
            </option>
          ))}
        </Secim>
      )}
      {degisti && (
        <Dugme type="button" onClick={kaydet} disabled={bekliyor} className="shrink-0 !px-3 !py-1.5 text-xs">
          Kaydet
        </Dugme>
      )}
      <button
        type="button"
        className={kucukDugme}
        disabled={ilkMi || bekliyor}
        onClick={() => calistir(() => secenekDegeriSiraDegistir(satir.id, "yukari"))}
        aria-label="Yukarı taşı"
      >
        ▲
      </button>
      <button
        type="button"
        className={kucukDugme}
        disabled={sonMu || bekliyor}
        onClick={() => calistir(() => secenekDegeriSiraDegistir(satir.id, "asagi"))}
        aria-label="Aşağı taşı"
      >
        ▼
      </button>
      <button
        type="button"
        className={`${kucukDugme} hover:!text-[#ff7a70]`}
        disabled={bekliyor}
        onClick={() => calistir(() => secenekDegeriAktifligiDegistir(satir.id, false))}
      >
        Kaldır
      </button>
    </div>
  );
}
