"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Alan, Etiket, MetinAlani, Secim } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import { dekontGoreviOlustur, type YeniEk } from "./actions";

// "Dekont / Evrak Gönder": WhatsApp'tan ya da kağıt olarak gelen dekontun fotoğrafı/PDF'i yüklenir,
// sorumluya atanır; tek adımda "bugün teslimli" bir görev açılır ve kapatılana kadar uyarı olarak durur.
export function DekontGonder({ kisiler, varsayilanId }: { kisiler: { id: string; adSoyad: string }[]; varsayilanId: string }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [ekler, setEkler] = useState<YeniEk[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  const [sorumlu, setSorumlu] = useState(varsayilanId);
  const [not, setNot] = useState("");

  async function dosyaSec(liste: FileList | null) {
    if (!liste || liste.length === 0) return;
    setYukleniyor(true);
    setHata("");
    try {
      for (const d of Array.from(liste)) {
        const s = await upload(`isler/dekont/${crypto.randomUUID()}-${d.name}`, d, { access: "private", handleUploadUrl: "/api/isler/blob-upload" });
        setEkler((m) => [...m, { url: s.url, ad: d.name, tur: d.type }]);
      }
    } catch (e) {
      setHata("Yüklenemedi: " + (e instanceof Error ? e.message : "bilinmeyen hata"));
    } finally {
      setYukleniyor(false);
    }
  }

  function kapat() {
    setAcik(false);
    setEkler([]);
    setNot("");
    setHata("");
  }

  function gonder() {
    setHata("");
    basla(async () => {
      const s = await dekontGoreviOlustur(sorumlu, not, ekler);
      if (s.hata) {
        setHata(s.hata);
        return;
      }
      kapat();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="rounded-lg border border-[#f2b04c]/60 bg-[#f2b04c]/15 px-3 py-1.5 text-sm font-semibold text-[#f2b04c] hover:bg-[#f2b04c]/25"
      >
        📎 Dekont / Evrak Gönder
      </button>
      {acik &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={kapat}>
            <div className="popover max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-1 text-base font-semibold text-white">Dekont / evrak görevi aç</h3>
              <p className="mb-3 text-xs text-white/50">
                Fotoğrafı ya da PDF&apos;i yükleyin; sorumluya bugün teslimli görev olarak düşer, işlenip kapatılana kadar uyarı olarak kalır.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <Alan>
                  <Etiket htmlFor="dk-dosya">Dekont / evrak (fotoğraf veya PDF)</Etiket>
                  <input
                    id="dk-dosya"
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => dosyaSec(e.target.files)}
                    className="block w-full text-sm text-white/70 file:mr-3 file:rounded-md file:border file:border-white/20 file:bg-white/10 file:px-3 file:py-1.5 file:text-white"
                  />
                  {yukleniyor && <p className="mt-1 text-xs text-white/50">Yükleniyor…</p>}
                  {ekler.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-xs text-[#5fd97a]">
                      {ekler.map((e) => (
                        <li key={e.url}>✓ {e.ad}</li>
                      ))}
                    </ul>
                  )}
                </Alan>
                <Alan>
                  <Etiket htmlFor="dk-kime">Kime atansın</Etiket>
                  <Secim id="dk-kime" value={sorumlu} onChange={(e) => setSorumlu(e.target.value)}>
                    {kisiler.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.adSoyad}
                      </option>
                    ))}
                  </Secim>
                </Alan>
                <Alan>
                  <Etiket htmlFor="dk-not">Not (biliyorsanız hangi dosya/müvekkil için, kim gönderdi)</Etiket>
                  <MetinAlani id="dk-not" rows={3} value={not} onChange={(e) => setNot(e.target.value)} placeholder="örn. KN-43, istinaf başvuru harcı, ödeyen: BA Mimarlık" />
                </Alan>
              </div>
              {hata && <p className="mt-2 text-sm text-[#ff7a70]">{hata}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={kapat} className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10">
                  Vazgeç
                </button>
                <Dugme type="button" onClick={gonder} disabled={bekliyor || yukleniyor || ekler.length === 0}>
                  {bekliyor ? "Kaydediliyor…" : "Görev olarak kaydet"}
                </Dugme>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
