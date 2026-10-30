"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  davaDosyalariTopluDurum,
  davaDosyalariTopluSil,
  davaDosyalariTopluSorumlu,
} from "@/modules/dava-dosyasi/lib/actions";
import { OnayliButon } from "@/core/ui/onayli-buton";

const kutu = "rounded-none border border-white/20 bg-white/[0.08] px-2 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]";

// Secili dosyalar icin toplu islem cubugu: durum degistir, sorumlu avukat ata, sil.
export function TopluIslemCubugu({
  secililer,
  durumlar,
  avukatlar,
  silmeYetkisiVar,
  temizle,
}: {
  secililer: { id: string; etiket: string }[];
  durumlar: { id: string; etiket: string }[];
  avukatlar: { id: string; adSoyad: string }[];
  silmeYetkisiVar: boolean;
  temizle: () => void;
}) {
  const router = useRouter();
  const [mesaj, setMesaj] = useState("");
  const [beklemede, basla] = useTransition();
  const idler = secililer.map((s) => s.id);

  function calistir(is: () => Promise<{ hata?: string; mesaj?: string }>) {
    setMesaj("");
    basla(async () => {
      const s = await is();
      if (s.hata) setMesaj(s.hata);
      else {
        setMesaj(s.mesaj ?? "Tamamlandı.");
        router.refresh();
      }
    });
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center gap-2 border-t-[3px] border-[#1c69d4] bg-[var(--yuzey,#1c2432)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
      role="region"
      aria-label="Toplu işlemler"
    >
      <span className="text-sm font-semibold uppercase tracking-wide text-white">{secililer.length} dosya seçili</span>

      <select
        className={kutu}
        disabled={beklemede}
        value=""
        aria-label="Durumu değiştir"
        onChange={(e) => {
          const durumId = e.target.value;
          if (durumId) calistir(() => davaDosyalariTopluDurum(idler, durumId));
        }}
      >
        <option value="">Durumu değiştir…</option>
        {durumlar.map((d) => (
          <option key={d.id} value={d.id}>
            {d.etiket}
          </option>
        ))}
      </select>

      <select
        className={kutu}
        disabled={beklemede}
        value=""
        aria-label="Sorumlu avukatı ata"
        onChange={(e) => {
          const v = e.target.value;
          if (v) calistir(() => davaDosyalariTopluSorumlu(idler, v === "-" ? null : v));
        }}
      >
        <option value="">Sorumlu avukat ata…</option>
        <option value="-">(Sorumluyu kaldır)</option>
        {avukatlar.map((a) => (
          <option key={a.id} value={a.id}>
            {a.adSoyad}
          </option>
        ))}
      </select>

      {silmeYetkisiVar && (
        <OnayliButon
          sifreIste
          boyut="kompakt"
          className="!rounded-none !bg-[#c0392b] !font-bold !uppercase !tracking-wide !text-white hover:!bg-[#d04a3b]"
          mesaj={`Seçili ${secililer.length} dosya silinecek. Finansal kaydı olan veya alt dosyası bulunan dosyalar silinmez; bunlar işlem sonunda listelenir. Devam etmek için şifrenizi girin.`}
          eylem={async (sifre) => {
            const s = await davaDosyalariTopluSil(idler, sifre);
            if (s.hata) return { hata: s.hata };
            router.refresh();
            if (s.hatalar.length > 0) {
              const etiket = (id: string) => secililer.find((x) => x.id === id)?.etiket ?? id;
              return {
                hata: `${s.silinen} dosya silindi, ${s.hatalar.length} dosya silinemedi: ${s.hatalar.map((h) => `${etiket(h.id)} (${h.hata})`).join("; ")}`,
              };
            }
            temizle();
          }}
        >
          Seçilenleri sil
        </OnayliButon>
      )}

      <button type="button" onClick={temizle} className="px-3 py-1.5 text-sm uppercase tracking-wide text-white/70 hover:bg-white/10 hover:text-white">
        Seçimi temizle
      </button>
      {mesaj && <span className="basis-full text-xs text-white/70">{mesaj}</span>}
    </div>
  );
}
