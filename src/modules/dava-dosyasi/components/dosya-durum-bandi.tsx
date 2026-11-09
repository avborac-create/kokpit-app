"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  const [onayBekleyen, setOnayBekleyen] = useState<string | null>(null); // onay bekleyen durum id'si ("" = secimi kaldir)
  const aktifRef = useRef<HTMLLIElement | null>(null);

  // Dar ekranda cizgi yatay kayar; secili adim gorunur alana gelsin.
  useEffect(() => {
    const el = aktifRef.current;
    if (el?.parentElement) el.parentElement.scrollLeft = el.offsetLeft - el.parentElement.clientWidth / 2 + el.clientWidth / 2;
  }, [secili]);

  const yol = secenekler.filter((s) => s.kod !== YAN_YOL_KODU);
  const yanYol = secenekler.find((s) => s.kod === YAN_YOL_KODU);
  const seciliSecenek = secenekler.find((s) => s.id === secili) ?? null;
  const seciliSira = yol.findIndex((s) => s.id === secili);

  // Tiklama dogrudan kaydetmez; once kullanicidan onay istenir.
  function iste(id: string) {
    setHata(null);
    setOnayBekleyen(id === secili ? "" : id); // seciliye tekrar tiklamak temizler
  }

  function sec(yeni: string) {
    setOnayBekleyen(null);
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

        <ol className="m-0 flex min-w-0 basis-full list-none gap-0 overflow-x-auto px-1 pb-1 pt-1.5 sm:basis-0 sm:flex-1" aria-label="Dosya durum kodu">
          {yol.map((s, i) => {
            const aktif = s.id === secili;
            const gecildi = seciliSira > i;
            return (
              <li key={s.id} ref={aktif ? aktifRef : undefined} className="relative min-w-[6.5rem] flex-1">
                <span
                  aria-hidden
                  className={`absolute top-[14px] h-[3px] ${i === 0 ? "left-1/2" : "left-0"} ${i === yol.length - 1 ? "right-1/2" : "right-0"} ${gecildi ? "bg-[var(--accent)]" : "bg-white/15"}`}
                />
                <button
                  type="button"
                  onClick={() => iste(s.id)}
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
            onClick={() => iste(yanYol.id)}
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
      {onayBekleyen !== null && (
        <div role="alertdialog" className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          <span className="min-w-0 flex-1">
            {onayBekleyen
              ? <>Dosya durumu <b>“{secenekler.find((x) => x.id === onayBekleyen)?.etiket}”</b> olarak değiştirilecektir. Onaylıyor musunuz?</>
              : <>Dosya durumu <b>“{seciliSecenek?.etiket}”</b> seçimi kaldırılacaktır. Onaylıyor musunuz?</>}
          </span>
          <button type="button" onClick={() => sec(onayBekleyen)} className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-[#0b1d36]">
            Evet, onaylıyorum
          </button>
          <button type="button" onClick={() => setOnayBekleyen(null)} className="rounded-full border border-white/30 px-4 py-1.5 text-xs font-semibold text-white/80">
            Vazgeç
          </button>
        </div>
      )}
      {hata && <p className="mt-2 text-xs text-[#ff7a70]">{hata}</p>}
    </div>
  );
}
