"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { GunlukDurumu } from "./islem-gunlugu";
import { sonIslemiGeriAl, sonIslemiYenidenUygula } from "./actions";

const SAAT_SINIRI = 60 * 60 * 1000; // alttaki hatirlatma cubugu son 1 saatteki islemler icin gorunur

function useIslem() {
  const yonlendirici = useRouter();
  const [bekliyor, basla] = useTransition();
  const [mesaj, setMesaj] = useState<{ metin: string; hata: boolean } | null>(null);
  function calistir(yon: "geri" | "ileri") {
    basla(async () => {
      const s = yon === "geri" ? await sonIslemiGeriAl() : await sonIslemiYenidenUygula();
      setMesaj(s.hata ? { metin: s.hata, hata: true } : { metin: `${yon === "geri" ? "Geri alındı" : "Yeniden uygulandı"}: ${s.ozet}`, hata: false });
      yonlendirici.refresh();
    });
  }
  return { bekliyor, mesaj, kapatMesaj: () => setMesaj(null), calistir };
}

const dugme =
  "glass inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/90 outline-none transition-colors hover:bg-white/10 active:opacity-60 disabled:opacity-30 md:h-9 md:w-9";

// Ust cubukta (genis ekran): son islemi geri al / yeniden uygula.
export function GeriAlDugmeleri({ durum }: { durum: GunlukDurumu }) {
  const { bekliyor, calistir } = useIslem();
  return (
    <div className="hidden items-center gap-1.5 md:flex">
      <button type="button" disabled={bekliyor || !durum.geri} onClick={() => calistir("geri")} title={durum.geri ? `Geri al: ${durum.geri.ozet}` : "Geri alınacak işlem yok"} aria-label="Son işlemi geri al" className={dugme}>
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
      </button>
      <button type="button" disabled={bekliyor || !durum.ileri} onClick={() => calistir("ileri")} title={durum.ileri ? `Yeniden uygula: ${durum.ileri.ozet}` : "Yeniden uygulanacak işlem yok"} aria-label="Son geri alınan işlemi yeniden uygula" className={dugme}>
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></svg>
      </button>
    </div>
  );
}

// Islemden sonra altta cikan bildirim: kapatilana kadar (en fazla 1 saat) kalir; Geri al / Yeniden uygula.
export function IslemCubugu({ durum }: { durum: GunlukDurumu }) {
  const { bekliyor, mesaj, kapatMesaj, calistir } = useIslem();
  const [kapatilan, setKapatilan] = useState<string | null>(null);
  const [simdi] = useState(() => Date.now());
  // Hangi durumu gosterecegiz: son hareket "uygulandi" mi "geri alindi" mi?
  const geriYeni = durum.geri && (!durum.ileri || durum.geri.zaman > durum.ileri.zaman);
  const aktif = geriYeni ? { tur: "geri" as const, ...durum.geri! } : durum.ileri ? { tur: "ileri" as const, ...durum.ileri } : null;
  const anahtar = aktif ? `${aktif.tur}:${aktif.id}` : "";
  const taze = aktif ? simdi - new Date(aktif.zaman).getTime() < SAAT_SINIRI : false;
  if (!mesaj && (!aktif || !taze || kapatilan === anahtar)) return null;
  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-[60] flex justify-end px-4 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
      <div className="pointer-events-auto flex max-w-xl flex-1 items-center gap-2 rounded-2xl border border-white/15 bg-[var(--background-2)] px-3.5 py-2.5 text-sm text-white shadow-2xl">
        <span className={`min-w-0 flex-1 ${mesaj?.hata ? "text-red-300" : ""}`}>{mesaj ? mesaj.metin : aktif!.tur === "geri" ? aktif!.ozet : `Geri alındı: ${aktif!.ozet}`}</span>
        {aktif && (
          <button type="button" disabled={bekliyor} onClick={() => calistir(aktif.tur)} className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 font-semibold text-white disabled:opacity-50">
            {aktif.tur === "geri" ? "↶ Geri al" : "↷ Yeniden uygula"}
          </button>
        )}
        <button type="button" aria-label="Kapat" onClick={() => { kapatMesaj(); setKapatilan(anahtar); }} className="shrink-0 px-1.5 text-white/50 hover:text-white">
          ✕
        </button>
      </div>
    </div>
  );
}
