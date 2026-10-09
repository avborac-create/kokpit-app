"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { secenekDegeriEkle } from "@/core/secenek/admin-actions";
import { SecenekDegeriSatiri } from "@/core/secenek/secenek-degeri-satiri";
import { Dugme } from "@/core/ui/button";
import { Girdi } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";

type Deger = { id: string; kod: string; etiket: string; aktifMi: boolean; maktuTutar: number | null };

// Bir acilir menunun (ör. Masraf Türü) degerlerini, kullanicinin bulundugu
// ekrandan ayrilmadan duzenlemek icin pencere. Yalniz yoneticilere
// gosterilir (sunucu tarafi admin-actions yetkiyi ayrica dogrular). Pencere
// portal ile body'ye tasinir: acilir menu bir <form> icinde oldugundan ic
// ice form olusmasin.
export function SecenekDuzenleyiciPenceresi({
  listeId,
  baslik,
  degerler,
}: {
  listeId: string;
  baslik: string;
  degerler: Deger[];
}) {
  const [acik, setAcik] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="text-xs text-[#6db8ff] hover:underline"
        title={`${baslik} listesini düzenle`}
      >
        ✎ Listeyi düzenle
      </button>
      {acik &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setAcik(false)}
          >
            <div
              className="popover max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">{baslik} — Liste Düzenleme</h3>
                <Dugme type="button" varyant="ikincil" boyut="kompakt" onClick={() => setAcik(false)}>
                  Kapat
                </Dugme>
              </div>
              <p className="mb-3 text-xs text-white/45">
                Değer adına tıklayarak yeniden adlandırabilir, ↑↓ ile sıralayabilir, “Pasife Al” ile menüden
                kaldırabilirsiniz (eski kayıtlar bozulmaz).
              </p>
              <div className="mb-3 overflow-x-auto rounded-xl border border-white/[0.06]">
                <table className="w-full text-left text-sm">
                  <thead className="text-white/40">
                    <tr>
                      <th className="px-4 py-2 font-medium">Etiket</th>
                      <th className="px-4 py-2 font-medium">Kod</th>
                      <th className="px-4 py-2 font-medium">Maktu Tutar</th>
                      <th className="px-4 py-2 font-medium">Sıra</th>
                      <th className="px-4 py-2 font-medium">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {degerler.map((d, i) => (
                      <SecenekDegeriSatiri key={d.id} deger={d} ilkMi={i === 0} sonMu={i === degerler.length - 1} />
                    ))}
                  </tbody>
                </table>
              </div>
              <form action={secenekDegeriEkle.bind(null, listeId)} className="flex items-center gap-2">
                <Girdi name="etiket" placeholder="Yeni değer ekle" required className="max-w-xs" />
                <GonderButonu varyant="ikincil" bekleyenMetin="Ekleniyor…">
                  + Ekle
                </GonderButonu>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
