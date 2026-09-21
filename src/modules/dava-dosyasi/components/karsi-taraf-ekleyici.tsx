"use client";

import { useState } from "react";
import { Alan, Etiket, Girdi } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";

type KarsiTarafCipi = { id: string; ad: string; mevcutMu: boolean };

// Eskiden ayri iki bilesendi: "var olan karsi taraflardan sec" (checkbox
// listesi) + "yeni ekle" (isim yaz + buton). Kullanici checkbox listesinin
// kendisini istemedi ("karşı tarafların sisteme kaydedilmesini
// istemiyorum") - ama ayni karsi tarafin birden fazla dosyaya
// baglanabilmesi (cek zincirindeki muteselsil sorumlular) hala gerekli.
// Cozum: TEK bir "yaz + Ekle" akisi. Var olan bir isim yazilirsa
// (buyuk/kucuk harf duyarsiz) sunucu tarafi (karsiTarafIdleriniCozumle,
// actions.ts) otomatik olarak AYNI kayda baglar, ikinci bir kayit
// olusturmaz - kullaniciya bunu secmesi hic gosterilmez.
export function KarsiTarafEkleyici({
  baslangicKarsiTaraflar = [],
}: {
  baslangicKarsiTaraflar?: { id: string; ad: string }[];
}) {
  const [cipler, setCipler] = useState<KarsiTarafCipi[]>(
    baslangicKarsiTaraflar.map((kt) => ({ ...kt, mevcutMu: true })),
  );
  const [girdi, setGirdi] = useState("");

  function ekle() {
    const ad = girdi.trim();
    if (!ad) return;
    setCipler((liste) => {
      // Ayni ismi (buyuk/kucuk harf duyarsiz) iki kez eklemeyi engelle -
      // sunucu tarafinda ayni karsi tarafa iki kez baglanmaya calisip
      // formu hataya dusurmesin (bkz. actions.ts karsiTarafIdleriniCozumle).
      if (liste.some((cip) => cip.ad.trim().toLowerCase() === ad.toLowerCase())) {
        return liste;
      }
      return [...liste, { id: ad, ad, mevcutMu: false }];
    });
    setGirdi("");
  }

  function kaldir(index: number) {
    setCipler((liste) => liste.filter((_, i) => i !== index));
  }

  return (
    <Alan>
      <Etiket htmlFor="karsiTarafGirdi">Karşı Taraf(lar)</Etiket>
      <div className="flex gap-2">
        <Girdi
          id="karsiTarafGirdi"
          value={girdi}
          onChange={(e) => setGirdi(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ekle();
            }
          }}
          placeholder="Koz Gıda"
        />
        <Dugme type="button" varyant="ikincil" onClick={ekle}>
          Ekle
        </Dugme>
      </div>
      {cipler.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {cipler.map((cip, i) => (
            <span
              key={`${cip.mevcutMu ? "m" : "y"}-${cip.id}-${i}`}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/85"
            >
              {cip.mevcutMu ? (
                <input type="hidden" name="karsiTarafIds" value={cip.id} />
              ) : (
                <input type="hidden" name="yeniKarsiTarafAdlari" value={cip.ad} />
              )}
              {cip.ad}
              <button
                type="button"
                onClick={() => kaldir(i)}
                className="text-white/40 hover:text-[#ff7a70]"
                aria-label={`${cip.ad} kaldır`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="mt-1 text-xs text-white/35">
        Aynı takipte birden fazla müteselsil sorumlu (keşideci + cirantalar) varsa hepsini
        ekleyin. Zaten kayıtlı bir isim yazarsanız otomatik olarak aynı karşı tarafa bağlanır.
      </p>
    </Alan>
  );
}
