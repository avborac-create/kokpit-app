"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adinaCalisBaslat, adinaCalisBitir } from "./adina-calis-actions";

// Yonetici icin: "Koltuk degistir" (eski adi: Kullanici gozuyle) secici (ust cubukta).
export function AdinaCalisSecici({ kullanicilar }: { kullanicilar: { id: string; ad: string }[] }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();

  function sec(id: string) {
    setHata("");
    basla(async () => {
      const s = await adinaCalisBaslat(id);
      if (s.hata) setHata(s.hata);
      else {
        router.push("/kokpit/hizli-veri-girisi/para-trafigi");
        router.refresh();
      }
    });
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setAcik((a) => !a)} className="whitespace-nowrap rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10" title="Koltuk değiştir: başka bir kullanıcının yerine geçip onun gördüğünü görün">
        🔄 Koltuk değiştir
      </button>
      {acik && (
        // Telefonda butonun soluna taşmasın diye ekrana göre sabit konumlanır (kenarlardan 12px).
        <div className="absolute right-0 top-full z-50 mt-1 max-h-72 w-60 overflow-y-auto rounded-xl border border-white/15 bg-[#14243c] p-1 shadow-xl max-sm:fixed max-sm:inset-x-3 max-sm:top-20 max-sm:mt-0 max-sm:max-h-[70vh] max-sm:w-auto">
          <p className="px-2 py-1 text-[11px] text-white/50">Seçtiğiniz kişi gibi görürsünüz; yaptığınız işlemler onun adına kaydedilir.</p>
          {kullanicilar.map((u) => (
            <button key={u.id} type="button" disabled={bekliyor} onClick={() => sec(u.id)} className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-white/85 hover:bg-white/10 disabled:opacity-50">
              {u.ad}
            </button>
          ))}
          {hata && <p className="px-2 py-1 text-xs text-[#ff7a70]">{hata}</p>}
        </div>
      )}
    </div>
  );
}

// Gozuyle calisirken her sayfada gorunen uyari seridi.
export function AdinaCalisSeridi({ hedefAd, gercekAd }: { hedefAd: string; gercekAd: string }) {
  const [bekliyor, basla] = useTransition();
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex w-max max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border border-[#f2b04c]/60 bg-[#2a1f0a]/95 px-4 py-2 text-sm text-[#f2b04c] shadow-2xl">
      <span>
        🔄 <b>{hedefAd}</b> koltuğundasınız <span className="text-[#f2b04c]/70">(işlemler onun adına kaydedilir; gerçek hesap: {gercekAd})</span>
      </span>
      <button
        type="button"
        disabled={bekliyor}
        onClick={() => basla(async () => { await adinaCalisBitir(); window.location.reload(); })}
        className="rounded-full bg-[#f2b04c] px-3 py-1 text-xs font-semibold text-[#2a1f0a] disabled:opacity-50"
      >
        Kendi hesabıma dön
      </button>
    </div>
  );
}
