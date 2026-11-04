"use client";

import { useState } from "react";
import { Alan, Etiket, Girdi } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import { MersisAra } from "@/core/unvan/mersis-ara";
import { DetsisAra } from "@/core/unvan/detsis-ara";
import { KISA_UNVAN_ONAY_METNI, KISA_UNVAN_UYARISI, unvanKisaMi } from "@/core/unvan/unvan-kontrol";

export type KarsiTarafCipi = { id: string; ad: string; tc?: string | null; detsis?: string | null; mevcutMu: boolean; kisa?: boolean };

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
  taslakCipler,
}: {
  baslangicKarsiTaraflar?: { id: string; ad: string; tc?: string | null; detsis?: string | null }[];
  // Form taslaktan geri yuklenirken (sayfa yenilenirse) yazilmis chip'ler oldugu gibi gelir.
  taslakCipler?: KarsiTarafCipi[];
}) {
  const [cipler, setCipler] = useState<KarsiTarafCipi[]>(
    taslakCipler ?? baslangicKarsiTaraflar.map((kt) => ({ ...kt, mevcutMu: true })),
  );
  const [girdi, setGirdi] = useState("");
  const [tcGirdi, setTcGirdi] = useState("");
  const [detsisGirdi, setDetsisGirdi] = useState("");
  const [kisaOnay, setKisaOnay] = useState(false);
  const kisaMi = unvanKisaMi(girdi);

  function ekle() {
    const ad = girdi.trim();
    if (!ad) return;
    if (kisaMi && !kisaOnay) return;
    setCipler((liste) => [...liste, { id: ad, ad, tc: tcGirdi.trim() || null, detsis: detsisGirdi.trim() || null, mevcutMu: false, kisa: kisaMi }]);
    setGirdi("");
    setTcGirdi("");
    setDetsisGirdi("");
    setKisaOnay(false);
  }

  function kaldir(index: number) {
    setCipler((liste) => liste.filter((_, i) => i !== index));
  }

  return (
    <Alan>
      <Etiket htmlFor="karsiTarafGirdi">Karşı Taraf</Etiket>
      <div className="flex gap-2">
        <Girdi
          id="karsiTarafGirdi"
          data-metin-duzeni="baslik"
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
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        <MersisAra ad={girdi} />
        <DetsisAra ad={girdi} />
        <Girdi
          id="karsiTarafDetsisGirdi"
          value={detsisGirdi}
          onChange={(e) => setDetsisGirdi(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ekle();
            }
          }}
          inputMode="numeric"
          maxLength={12}
          placeholder="DETSİS no (kamu kurumu ise)"
          className="max-w-[14rem]"
          aria-label="Karşı taraf DETSİS numarası"
        />
      </div>
      {kisaMi && (
        <div className="mt-2 rounded-xl border border-[#f2b04c]/40 bg-[#f2b04c]/10 p-3 text-sm text-[#f3d9a8]">
          <p>{KISA_UNVAN_UYARISI}</p>
          <label className="mt-2 flex items-start gap-2 text-white/85">
            <input type="checkbox" checked={kisaOnay} onChange={(e) => setKisaOnay(e.target.checked)} className="mt-1 h-4 w-4 accent-[#f2b04c]" />
            <span>{KISA_UNVAN_ONAY_METNI}</span>
          </label>
        </div>
      )}
      {cipler.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <input type="hidden" name="karsiTarafTaslagi" value={JSON.stringify(cipler)} />
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
                  <input type="hidden" name="yeniKarsiTarafDetsisleri" value={cip.detsis ?? ""} />
                  <input type="hidden" name="yeniKarsiTarafKisa" value={cip.kisa ? "1" : "0"} />
                </>
              )}
              {cip.ad}
              {cip.tc && <span className="text-white/45">· {cip.tc}</span>}
              {cip.detsis && <span className="text-white/45">· DETSİS {cip.detsis}</span>}
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
