"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Girdi, Secim } from "@/core/ui/form";

type Props = {
  arama: string;
  durum: string;
  musteri?: string;
  durumlar: { id: string; kod: string; etiket: string }[];
};

/**
 * Dosya listesi filtresi: yazdikca (kisa gecikmeyle) ve secim degisince aninda
 * uygulanir. Filtre aktifken kutu vurgulanir ve "Filtre aktif" rozeti +
 * "Temizle" dugmesi gorunur (genel kural: arama kutulari canli filtreler ve
 * aktif filtre gozden kacmaz).
 */
export function DosyaFiltre({ arama, durum, musteri, durumlar }: Props) {
  const router = useRouter();
  const [bekliyor, baslat] = useTransition();
  const [metin, setMetin] = useState(arama);
  const [durumSecimi, setDurumSecimi] = useState(durum);
  const ilk = useRef(true);

  useEffect(() => {
    if (ilk.current) {
      ilk.current = false;
      return;
    }
    if (metin.trim() === arama.trim() && durumSecimi === durum) return;
    const zamanlayici = setTimeout(() => {
      // Bos deger de gonderilir: anahtarin varligi "kullanici filtreyi kaldirdi" demektir (bkz. page.tsx).
      const q = new URLSearchParams();
      if (musteri) q.set("musteri", musteri);
      q.set("arama", metin.trim());
      q.set("durum", durumSecimi);
      baslat(() => router.replace(`/kokpit/dava-dosyalari?${q.toString()}`, { scroll: false }));
    }, 250);
    return () => clearTimeout(zamanlayici);
  }, [metin, durumSecimi, arama, durum, musteri, router]);

  const aramaAktif = metin.trim() !== "";
  const durumAktif = durumSecimi !== "";
  const aktif = aramaAktif || durumAktif || Boolean(musteri);

  return (
    <form className="mb-6 flex flex-wrap items-center gap-3" onSubmit={(e) => e.preventDefault()}>
      <Girdi
        type="search"
        name="arama"
        placeholder="Müvekkil, karşı taraf, büro no, dosya no, birim, konu…"
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        autoComplete="off"
        className={`max-w-md ${aramaAktif ? "!border-[var(--accent)] ring-2 ring-[var(--accent)]/40" : ""}`}
      />
      <Secim
        name="durum"
        value={durumSecimi}
        onChange={(e) => setDurumSecimi(e.target.value)}
        className={`max-w-[10rem] ${durumAktif ? "!border-[var(--accent)] ring-2 ring-[var(--accent)]/40" : ""}`}
      >
        <option value="">Tüm durumlar</option>
        {durumlar.map((d) => (
          <option key={d.id} value={d.kod}>
            {d.etiket}
          </option>
        ))}
      </Secim>
      {aktif && (
        <div className="flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-white">
          <span>{bekliyor ? "Filtreleniyor…" : "⚠ Liste filtreli"}</span>
          <button
            type="button"
            onClick={() => {
              setMetin("");
              setDurumSecimi("");
              baslat(() => router.replace("/kokpit/dava-dosyalari?temizle=1", { scroll: false }));
            }}
            className="rounded-full bg-white/15 px-2 py-0.5 hover:bg-white/30"
          >
            Filtreyi temizle ✕
          </button>
        </div>
      )}
    </form>
  );
}
