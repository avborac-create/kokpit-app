"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Dugme } from "./button";

// Silme gibi geri alinamaz islemler icin native confirm() ile onay isteyen,
// sonrasinda mevcut route'u yenileyen (router.refresh) kucuk bir buton.
//
// ONEMLI: Bir Server Action'i dogrudan <form action={...}> uzerinden
// cagirmak yerine burada onClick + router.refresh() kullaniyoruz. Nedeni:
// yonlendirme (redirect) YAPMAYAN Server Action'lar (orn. bir listeden tek
// bir satir silme) form ile cagrildiginda Next.js'in mevcut route'u
// otomatik yenilemesi bu projede guvenilir calismadi (DOM guncellenmiyordu).
// router.refresh() ile bu acikca garanti altina alinir. Yonlendirme yapan
// Server Action'lar icin (orn. tum kaydi silme) bu ekstra refresh zararsizdir.
export function OnayliButon({
  eylem,
  mesaj,
  sifreIste = false,
  varyant = "tehlike",
  boyut = "normal",
  className,
  children,
}: {
  eylem: (sifre: string) => Promise<void>;
  mesaj: string;
  // true ise native confirm() yerine sifre kutulu bir onay penceresi acilir;
  // girilen sifre eylem'e iletilir ve SUNUCUDA dogrulanir (bkz.
  // core/auth/silme-dogrulama.ts). Silme butonlari icin kullanilir.
  sifreIste?: boolean;
  varyant?: "birincil" | "ikincil" | "tehlike";
  boyut?: "normal" | "kompakt";
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [beklemede, baslatTransition] = useTransition();
  const [pencereAcik, setPencereAcik] = useState(false);
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState<string | null>(null);

  function sifreyleCalistir() {
    setHata(null);
    baslatTransition(async () => {
      try {
        await eylem(sifre);
        setPencereAcik(false);
        setSifre("");
        router.refresh();
      } catch (e) {
        // Yanlis sifrede pencere acik kalir, hata pencerede gosterilir.
        setHata(e instanceof Error ? e.message : "İşlem başarısız oldu.");
      }
    });
  }

  function pencereyiKapat() {
    setPencereAcik(false);
    setSifre("");
    setHata(null);
  }

  return (
    <>
    <Dugme
      type="button"
      varyant={varyant}
      boyut={boyut}
      className={className}
      disabled={beklemede}
      onClick={() => {
        if (sifreIste) {
          setPencereAcik(true);
          return;
        }
        if (!confirm(mesaj)) return;
        baslatTransition(async () => {
          try {
            await eylem("");
            router.refresh();
          } catch (hata) {
            // Server action'in atttigi (ör. "bu kayitta finansal veri var,
            // silinemez" gibi) anlamli hatayi kullaniciya goster - aksi
            // halde islem sessizce basarisiz olur/genel bir hata ekranina
            // duserdi.
            alert(hata instanceof Error ? hata.message : "İşlem başarısız oldu.");
          }
        });
      }}
    >
      {children}
    </Dugme>
    {pencereAcik &&
      createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={pencereyiKapat}>
          <form
            className="popover w-full max-w-sm rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              sifreyleCalistir();
            }}
          >
            <p className="mb-3 text-sm text-white/85">{mesaj}</p>
            <label htmlFor="silme-sifresi" className="mb-1 block text-xs text-white/55">
              İşlemi onaylamak için şifrenizi girin
            </label>
            <input
              id="silme-sifresi"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
            />
            {hata && <p className="mt-2 text-sm text-[#ff7a70]">{hata}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Dugme type="button" varyant="ikincil" onClick={pencereyiKapat}>
                Vazgeç
              </Dugme>
              <Dugme type="submit" varyant="tehlike" disabled={beklemede || sifre === ""}>
                Sil
              </Dugme>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </>
  );
}
