"use client";

import { useState, useTransition } from "react";
import { Alan, Etiket, Girdi } from "@/core/ui/form";
import { icraDosyasiAra } from "@/modules/haciz-raporu/lib/actions";
import type { IcraDosyasiAday } from "@/modules/haciz-raporu/lib/queries";

function dosyaEtiketi(dosya: IcraDosyasiAday): string {
  const borclular = dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ");
  return [
    `KP-${String(dosya.kayitNo).padStart(4, "0")} · ${dosya.dosyaNo ?? "—"}`,
    dosya.konu,
    borclular || null,
  ]
    .filter(Boolean)
    .join(" — ");
}

// "Yeni Haciz Raporu" formunda İcra Dosyası seçimi: sistemde çok sayıda
// icra dosyası olabileceğinden, arama kutulu açılır menü ile dosya
// no VEYA borçlu (karşı taraf) adına göre sunucuda aranır (bkz.
// icraDosyasiAra - tüm liste tarayıcıya baştan yüklenmez).
export function IcraDosyasiSecici({ baslangicSecili }: { baslangicSecili?: IcraDosyasiAday | null }) {
  const [secili, setSecili] = useState<IcraDosyasiAday | null>(baslangicSecili ?? null);
  const [acikMi, setAcikMi] = useState(false);
  const [sorgu, setSorgu] = useState("");
  const [sonuclar, setSonuclar] = useState<IcraDosyasiAday[]>([]);
  const [, startTransition] = useTransition();

  function ara(deger: string) {
    setSorgu(deger);
    startTransition(async () => {
      const sonuc = await icraDosyasiAra(deger);
      setSonuclar(sonuc);
    });
  }

  return (
    <Alan>
      <Etiket htmlFor="icraDosyasiAramaKutusu">İcra Dosyası</Etiket>
      <input type="hidden" name="icraDosyasiId" value={secili?.id ?? ""} required={!secili} />

      {secili && !acikMi ? (
        <div className="glass flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-white/85">
          <span className="truncate">{dosyaEtiketi(secili)}</span>
          <button
            type="button"
            onClick={() => setSecili(null)}
            className="shrink-0 text-xs text-white/40 hover:text-white/70"
          >
            Değiştir
          </button>
        </div>
      ) : (
        <div className="relative">
          <Girdi
            id="icraDosyasiAramaKutusu"
            type="text"
            placeholder="Dosya no veya borçlu adı ile arayın…"
            value={sorgu}
            onFocus={() => {
              setAcikMi(true);
              if (sonuclar.length === 0) ara("");
            }}
            onChange={(e) => ara(e.target.value)}
          />
          {acikMi && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => {
                  setAcikMi(false);
                  setSorgu("");
                }}
              />
              <div className="glass absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl p-1">
                {sonuclar.length === 0 && (
                  <p className="px-3 py-2 text-sm text-white/40">
                    Sonuç bulunamadı. Dosya listesinden aradığınızı bulamıyorsanız önce Dosyalar'dan
                    oluşturun, sonra bu seçime geri dönün.
                  </p>
                )}
                {sonuclar.map((dosya) => (
                  <button
                    key={dosya.id}
                    type="button"
                    onClick={() => {
                      setSecili(dosya);
                      setAcikMi(false);
                      setSorgu("");
                    }}
                    className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-white/85 hover:bg-white/[0.08]"
                  >
                    {dosyaEtiketi(dosya)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Alan>
  );
}
