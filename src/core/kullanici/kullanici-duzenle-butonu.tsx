"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Dugme } from "@/core/ui/button";
import type { BuroRolu } from "@prisma/client";
import { kullaniciGuncelle } from "./actions";
import { BURO_ROLLERI, BURO_ROLU_ETIKETLERI, UYGULAMA_ROLU_ETIKETLERI, type UygulamaRolu } from "./rol-etiketleri";
import { SifreAlani } from "./sifre-alani";

const girdiSinifi =
  "w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)] [color-scheme:dark]";

export function KullaniciDuzenleButonu({
  id,
  adSoyad,
  eposta,
  uygulamaRolu,
  buroRolu,
}: {
  id: string;
  adSoyad: string;
  eposta: string;
  uygulamaRolu: UygulamaRolu;
  buroRolu: BuroRolu;
}) {
  const router = useRouter();
  const [beklemede, baslat] = useTransition();
  const [acik, setAcik] = useState(false);
  const [ad, setAd] = useState(adSoyad);
  const [posta, setPosta] = useState(eposta);
  const [sifre, setSifre] = useState("");
  const [rol, setRol] = useState<UygulamaRolu>(uygulamaRolu);
  const [buro, setBuro] = useState<BuroRolu>(buroRolu);
  const [hata, setHata] = useState<string | null>(null);

  function ac() {
    setAd(adSoyad);
    setPosta(eposta);
    setRol(uygulamaRolu);
    setBuro(buroRolu);
    setSifre("");
    setHata(null);
    setAcik(true);
  }

  function kaydet() {
    setHata(null);
    baslat(async () => {
      try {
        await kullaniciGuncelle(id, ad, posta, sifre, rol, buro);
        setAcik(false);
        router.refresh();
      } catch (e) {
        setHata(e instanceof Error ? e.message : "İşlem başarısız oldu.");
      }
    });
  }

  return (
    <>
      <Dugme type="button" varyant="ikincil" onClick={ac}>
        Düzenle
      </Dugme>
      {acik &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setAcik(false)}
          >
            <form
              className="popover w-full max-w-md rounded-2xl p-5 text-left"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                kaydet();
              }}
            >
              <h3 className="mb-4 text-base font-semibold text-white">Kullanıcıyı Düzenle</h3>

              <label htmlFor="duzenle-ad" className="mb-1 block text-xs text-white/55">
                Ad Soyad
              </label>
              <input
                id="duzenle-ad"
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                required
                autoComplete="off"
                className={girdiSinifi}
              />

              <label htmlFor="duzenle-eposta" className="mb-1 mt-3 block text-xs text-white/55">
                E-posta (giriş adı)
              </label>
              <input
                id="duzenle-eposta"
                type="email"
                value={posta}
                onChange={(e) => setPosta(e.target.value)}
                required
                autoComplete="off"
                className={girdiSinifi}
              />

              <label htmlFor="duzenle-sifre" className="mb-1 mt-3 block text-xs text-white/55">
                Yeni Şifre (değiştirmek istemiyorsanız boş bırakın)
              </label>
              <SifreAlani id="duzenle-sifre" deger={sifre} degisti={setSifre} sinif={girdiSinifi} />

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="duzenle-rol" className="mb-1 block text-xs text-white/55">
                    Uygulama Rolü
                  </label>
                  <select
                    id="duzenle-rol"
                    value={rol}
                    onChange={(e) => setRol(e.target.value as UygulamaRolu)}
                    className={girdiSinifi}
                  >
                    {(Object.keys(UYGULAMA_ROLU_ETIKETLERI) as UygulamaRolu[]).map((r) => (
                      <option key={r} value={r}>
                        {UYGULAMA_ROLU_ETIKETLERI[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="duzenle-buro" className="mb-1 block text-xs text-white/55">
                    Büro Rolü
                  </label>
                  <select
                    id="duzenle-buro"
                    value={buro}
                    onChange={(e) => setBuro(e.target.value as BuroRolu)}
                    className={girdiSinifi}
                  >
                    {BURO_ROLLERI.map((r) => (
                      <option key={r} value={r}>
                        {BURO_ROLU_ETIKETLERI[r]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-white/40">
                Rol değişikliği, kişi bir sonraki girişinde etkinleşir.
              </p>

              {hata && <p className="mt-3 text-sm text-[#ff7a70]">{hata}</p>}
              <div className="mt-4 flex justify-end gap-2">
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
