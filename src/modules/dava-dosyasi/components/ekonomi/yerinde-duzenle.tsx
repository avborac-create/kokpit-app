"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { Dugme } from "@/core/ui/button";
import { satirGuncelle } from "@/modules/dava-dosyasi/lib/cari-sistem-actions";
import type { SatirDuzenleme } from "@/modules/dava-dosyasi/lib/cari-sistem";

// Defter satirinda "Duzenle": baska sayfaya gitmeden ayni ekranda pencere acar.
export function YerindeDuzenle({
  duzenle,
  yontemler,
}: {
  duzenle: SatirDuzenleme;
  yontemler?: { id: string; etiket: string }[];
}) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [beklemede, baslat] = useTransition();
  const virmanMi = duzenle.tip === "virman";

  function kaydet(formData: FormData) {
    setHata(null);
    baslat(async () => {
      const sonuc = await satirGuncelle(duzenle.tip, duzenle.id, formData);
      if (sonuc.hata) {
        setHata(sonuc.hata);
        return;
      }
      setAcik(false);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setAcik(true)} className="text-xs text-[#6db8ff] hover:underline">
        Düzenle
      </button>
      {acik &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={() => setAcik(false)}>
            <form
              action={kaydet}
              className="popover w-full max-w-md rounded-2xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-1 text-base font-semibold text-white">{virmanMi ? "Virmanı Düzenle" : "Kaydı Düzenle"}</h3>
              <p className="mb-4 text-xs text-white/45">
                {virmanMi
                  ? "Tarih ve tutar, virmanın iki tarafındaki kayıtta birlikte değişir. Para Trafiği eksiye düşemez."
                  : "Tarih, tutar ve açıklama düzeltilebilir. Para Trafiği, virmanla kullanılmış tutarın altına indirilemez."}
              </p>
              <Alan>
                <Etiket htmlFor="yd-tarih">Tarih</Etiket>
                <Girdi id="yd-tarih" name="tarih" type="date" required defaultValue={duzenle.tarih} />
              </Alan>
              <Alan>
                <Etiket htmlFor="yd-tutar">Tutar</Etiket>
                <ParaGirdisi id="yd-tutar" name="tutar" required defaultValue={duzenle.tutar} />
              </Alan>
              {!virmanMi && (
                <Alan>
                  <Etiket htmlFor="yd-aciklama">Açıklama</Etiket>
                  <Girdi id="yd-aciklama" name="aciklama" defaultValue={duzenle.aciklama} />
                </Alan>
              )}
              {!virmanMi && yontemler && (
                <Alan>
                  <Etiket htmlFor="yd-yontem">Ödeme Şekli</Etiket>
                  <Secim id="yd-yontem" name="yontemId" defaultValue={duzenle.yontemId ?? ""}>
                    <option value="">Belirtilmedi</option>
                    {yontemler.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.etiket}
                      </option>
                    ))}
                  </Secim>
                </Alan>
              )}
              {hata && <p className="mb-3 text-sm text-[#ff7a70]">{hata}</p>}
              <div className="flex justify-end gap-2">
                <Dugme type="button" varyant="ikincil" onClick={() => setAcik(false)}>
                  Vazgeç
                </Dugme>
                <Dugme type="submit" disabled={beklemede}>
                  {beklemede ? "Kaydediliyor…" : "Kaydet"}
                </Dugme>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
