"use client";

import { useState } from "react";
import { Alan, Etiket, Girdi } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";

type KarsiTarafCipi = { id: string; ad: string; tc?: string | null; mevcutMu: boolean };

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
  baslangicKarsiTaraflar?: { id: string; ad: string; tc?: string | null }[];
}) {
  const [cipler, setCipler] = useState<KarsiTarafCipi[]>(
    baslangicKarsiTaraflar.map((kt) => ({ ...kt, mevcutMu: true })),
  );
  const [girdi, setGirdi] = useState("");
  const [tcGirdi, setTcGirdi] = useState("");

  function ekle() {
    const ad = girdi.trim();
    if (!ad) return;
    setCipler((liste) => [...liste, { id: ad, ad, tc: tcGirdi.trim() || null, mevcutMu: false }]);
    setGirdi("");
    setTcGirdi("");
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
        <Girdi
          id="karsiTarafTcGirdi"
          value={tcGirdi}
          onChange={(e) => setTcGirdi(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ekle();
            }
          }}
          inputMode="numeric"
          maxLength={11}
          placeholder="TC / VKN"
          className="max-w-[10rem]"
          aria-label="Karşı taraf TC kimlik / vergi kimlik no"
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
                <>
                  <input type="hidden" name="yeniKarsiTarafAdlari" value={cip.ad} />
                  <input type="hidden" name="yeniKarsiTarafTcleri" value={cip.tc ?? ""} />
                </>
              )}
              {cip.ad}
              {cip.tc && <span className="text-white/45">· {cip.tc}</span>}
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
