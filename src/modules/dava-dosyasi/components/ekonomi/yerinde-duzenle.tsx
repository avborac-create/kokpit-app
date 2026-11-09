"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { Dugme } from "@/core/ui/button";
import { satirGuncelle, virmanDuzenleBilgisi } from "@/modules/dava-dosyasi/lib/cari-sistem-actions";
import type { SatirDuzenleme } from "@/modules/dava-dosyasi/lib/cari-sistem";

// Defter satirinda "Duzenle": baska sayfaya gitmeden ayni ekranda pencere acar.
export function YerindeDuzenle({
  duzenle,
  yontemler,
  virman,
  satirDosyaId,
}: {
  duzenle: SatirDuzenleme;
  yontemler?: { id: string; etiket: string }[];
  virman?: { eylem: (formData: FormData) => void | Promise<void>; hedefler: { id: string; etiket: string }[]; kapsamDosyaId: string };
  satirDosyaId?: string;
}) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [beklemede, baslat] = useTransition();
  const [virmanModu, setVirmanModu] = useState(false);
  const virmanMi = duzenle.tip === "virman";
  const [hedefBilgisi, setHedefBilgisi] = useState<{ hedefId: string | null; hedefler: { id: string; etiket: string }[] } | null>(null);

  function ac() {
    setAcik(true);
    if (virmanMi) void virmanDuzenleBilgisi(duzenle.id).then(setHedefBilgisi).catch(() => setHedefBilgisi(null));
  }

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

  function virmanYap(formData: FormData) {
    setHata(null);
    if (virman) {
      formData.set("kaynak", virman.kapsamDosyaId ? "dosya" : "havuz");
      if (!virman.kapsamDosyaId && satirDosyaId) formData.set("dosyaId", satirDosyaId);
    }
    baslat(async () => {
      try {
        await virman?.eylem(formData);
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Virman yapılamadı.");
        return;
      }
      setVirmanModu(false);
      setAcik(false);
      router.refresh();
    });
  }

  const virmanYapilabilir = Boolean(virman && !virmanMi && yontemler);

  return (
    <>
      <button type="button" onClick={ac} className="text-xs text-[#6db8ff] hover:underline">
        Düzenle
      </button>
      {acik &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={() => setAcik(false)}>
            {virmanModu && virman ? (
              <form action={virmanYap} className="popover w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
                <h3 className="mb-1 text-base font-semibold text-white">⇄ Bu Ödemeden Virman Yap</h3>
                <p className="mb-4 text-xs text-white/45">Para Trafiği&apos;ndeki parayı seçtiğiniz hesaba aktarır. Aktarılabilir tutar kadarını girebilirsiniz.</p>
                <Alan>
                  <Etiket htmlFor="yd-v-hedef">Hedef Hesap</Etiket>
                  <Secim id="yd-v-hedef" name="hedefHesapId" required defaultValue="">
                    <option value="" disabled>
                      Seçiniz…
                    </option>
                    {virman.hedefler.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.etiket}
                      </option>
                    ))}
                  </Secim>
                </Alan>
                <Alan>
                  <Etiket htmlFor="yd-v-tarih">Tarih</Etiket>
                  <Girdi id="yd-v-tarih" name="tarih" type="date" required defaultValue={duzenle.tarih} />
                </Alan>
                <Alan>
                  <Etiket htmlFor="yd-v-tutar">Tutar</Etiket>
                  <ParaGirdisi id="yd-v-tutar" name="tutar" required defaultValue={duzenle.tutar} />
                </Alan>
                <Alan>
                  <Etiket htmlFor="yd-v-aciklama">Açıklama (isteğe bağlı)</Etiket>
                  <Girdi id="yd-v-aciklama" name="aciklama" autoComplete="off" />
                </Alan>
                {hata && <p className="mb-3 text-sm text-[#ff7a70]">{hata}</p>}
                <div className="flex justify-end gap-2">
                  <Dugme type="button" varyant="ikincil" onClick={() => setVirmanModu(false)}>
                    Geri
                  </Dugme>
                  <Dugme type="submit" disabled={beklemede}>
                    {beklemede ? "Aktarılıyor…" : "Virman Yap"}
                  </Dugme>
                </div>
              </form>
            ) : (
            <form
              action={kaydet}
              className="popover w-full max-w-md rounded-2xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-1 text-base font-semibold text-white">{virmanMi ? "Virmanı Düzenle" : "Kaydı Düzenle"}</h3>
              <p className="mb-4 text-xs text-white/45">
                {virmanMi
                  ? "Hedef hesap, tarih, tutar ve not, virmanın iki tarafındaki kayıtta birlikte değişir. Para Trafiği eksiye düşemez."
                  : "Tarih, tutar, açıklama, ödeme şekli ve para kaynağı düzeltilebilir. Para Trafiği, virmanla kullanılmış tutarın altına indirilemez."}
              </p>
              {virmanMi && hedefBilgisi && hedefBilgisi.hedefId && (
                <Alan>
                  <Etiket htmlFor="yd-hedef">Hedef Hesap</Etiket>
                  <Secim id="yd-hedef" name="hedefHesapId" defaultValue={hedefBilgisi.hedefId}>
                    {hedefBilgisi.hedefler.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.etiket}
                      </option>
                    ))}
                  </Secim>
                </Alan>
              )}
              <Alan>
                <Etiket htmlFor="yd-tarih">Tarih</Etiket>
                <Girdi id="yd-tarih" name="tarih" type="date" required defaultValue={duzenle.tarih} />
              </Alan>
              <Alan>
                <Etiket htmlFor="yd-tutar">Tutar</Etiket>
                <ParaGirdisi id="yd-tutar" name="tutar" required defaultValue={duzenle.tutar} />
              </Alan>
              <Alan>
                <Etiket htmlFor="yd-aciklama">{virmanMi ? "Not (virman açıklamasına eklenir)" : "Açıklama"}</Etiket>
                <Girdi id="yd-aciklama" name="aciklama" defaultValue={duzenle.aciklama} />
              </Alan>
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
              {!virmanMi && yontemler && (
                <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-white/85">
                  <input type="hidden" name="borcludanForm" value="1" />
                  <input type="checkbox" name="borcludan" value="1" defaultChecked={duzenle.borcludan} className="h-4 w-4 accent-[var(--accent)]" />
                  Para karşı taraftan geldi
                </label>
              )}
              {hata && <p className="mb-3 text-sm text-[#ff7a70]">{hata}</p>}
              <div className="flex justify-end gap-2">
                {virmanYapilabilir && (
                  <Dugme type="button" varyant="ikincil" onClick={() => { setHata(null); setVirmanModu(true); }}>
                    ⇄ Virman yap
                  </Dugme>
                )}
                <Dugme type="button" varyant="ikincil" onClick={() => setAcik(false)}>
                  Vazgeç
                </Dugme>
                <Dugme type="submit" disabled={beklemede}>
                  {beklemede ? "Kaydediliyor…" : "Kaydet"}
                </Dugme>
              </div>
            </form>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
