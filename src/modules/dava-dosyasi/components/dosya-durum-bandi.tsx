"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dosyaAlanlariniGuncelle } from "@/modules/dava-dosyasi/lib/actions";

type DurumSecenegi = { id: string; etiket: string; kod: string };

// Dosya Durum Kodu: tek satirlik kompakt "yasam cizgisi". Asil yol (Derdest ->
// Kesinlesme Serhi) cizgi uzerinde adimlar halinde; "Yargilamanin Yenilenmesi"
// kesinlesmeden sonra acilan yan yol oldugu icin kesik cizgili ayri hap olarak
// gosterilir. Bir adima tiklamak durumu kaydeder (liste Ayarlar > Secenek
// Listeleri'nden duzenlenir; listeye eklenen yeni durumlar cizgiye eklenir).
const YAN_YOL_KODU = "yargilamanin_yenilenmesi";

export function DosyaDurumBandi({
  dosyaId,
  secenekler,
  seciliId,
}: {
  dosyaId: string;
  secenekler: DurumSecenegi[];
  seciliId: string | null;
}) {
  const router = useRouter();
  const [bekliyor, startTransition] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [secili, setSecili] = useState(seciliId);

  const yol = secenekler.filter((s) => s.kod !== YAN_YOL_KODU);
  const yanYol = secenekler.find((s) => s.kod === YAN_YOL_KODU);
  const seciliSecenek = secenekler.find((s) => s.id === secili) ?? null;
  const seciliSira = yol.findIndex((s) => s.id === secili);

  function sec(id: string) {
    const yeni = id === secili ? "" : id; // seciliye tekrar tiklamak temizler
    setHata(null);
    const onceki = secili;
    setSecili(yeni || null);
    startTransition(async () => {
      try {
        await dosyaAlanlariniGuncelle(dosyaId, { durumKoduId: yeni });
        router.refresh();
      } catch (e) {
        setSecili(onceki);
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      }
    });
  }

  if (secenekler.length === 0) return null;

  return (
    <div
      className={`glass mb-3 rounded-2xl border border-[var(--accent)]/30 bg-gradient-to-r from-[var(--accent-soft)] to-transparent px-4 py-3 ${bekliyor ? "opacity-80" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-[9rem]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8fb4e8]">Dosya durumu</p>
          <p className={`text-xl font-bold leading-tight ${seciliSecenek ? "text-white" : "text-white/40"}`}>
            {seciliSecenek?.etiket ?? "Seçilmedi"}
          </p>
        </div>

        <ol className="m-0 flex min-w-0 flex-1 list-none gap-0 overflow-x-auto p-0 pb-0.5" aria-label="Dosya durum kodu">
          {yol.map((s, i) => {
            const aktif = s.id === secili;
            const gecildi = seciliSira > i;
            return (
              <li key={s.id} className="relative min-w-[5.5rem] flex-1">
                <span
                  aria-hidden
                  className={`absolute top-[7px] h-[3px] ${i === 0 ? "left-1/2" : "left-0"} ${i === yol.length - 1 ? "right-1/2" : "right-0"} ${gecildi ? "bg-[var(--accent)]" : "bg-white/15"}`}
                />
                <button
                  type="button"
                  onClick={() => sec(s.id)}
                  disabled={bekliyor}
                  aria-pressed={aktif}
                  title={aktif ? "Seçimi kaldırmak için tıklayın" : `Durumu "${s.etiket}" yap`}
                  className="group relative flex w-full flex-col items-center gap-1 px-1 text-center outline-none"
                >
                  <span
                    className={`relative z-[1] h-[17px] w-[17px] rounded-full border-[3px] transition ${
                      aktif
                        ? "border-[var(--accent)] bg-[var(--accent)] shadow-[0_0_0_4px_rgba(143,180,232,0.25)]"
                        : gecildi
                          ? "border-[var(--accent)] bg-[var(--accent)]"
                          : "border-white/25 bg-[#2f343c] group-hover:border-[#8fb4e8] group-focus-visible:border-[#8fb4e8]"
                    }`}
                  />
                  <span className={`text-xs leading-tight ${aktif ? "font-bold text-white" : "font-medium text-white/60 group-hover:text-white"}`}>
                    {s.etiket}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {yanYol && (
          <button
            type="button"
            onClick={() => sec(yanYol.id)}
            disabled={bekliyor}
            aria-pressed={yanYol.id === secili}
            title="Kesinleşmiş dosyada açılan yan yol"
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${
              yanYol.id === secili
                ? "border-[var(--accent)] bg-[var(--accent)] text-[#0b1d36]"
                : "border-dashed border-white/30 text-white/60 hover:border-[#8fb4e8] hover:text-white"
            }`}
          >
            {yanYol.etiket}
          </button>
        )}
      </div>
      {hata && <p className="mt-2 text-xs text-[#ff7a70]">{hata}</p>}
    </div>
  );
}
