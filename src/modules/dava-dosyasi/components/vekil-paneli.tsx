"use client";

import { useState, useTransition } from "react";
import { sorumluAvukatiGuncelle, uyapVekilDurumunuGuncelle } from "@/modules/dava-dosyasi/lib/actions";

type Avukat = { id: string; adSoyad: string };

// Dosya kartindaki "Vekil Bilgileri" paneli: sorumlu avukat (acilir menu) ve
// UYAP'ta vekil olarak kayitli avukatlar (onay kutulari). Her degisiklik aninda kaydedilir.
export function VekilPaneli({
  dosyaId,
  avukatlar,
  sorumluAvukatId,
  uyapVekilIdleri,
}: {
  dosyaId: string;
  avukatlar: Avukat[];
  sorumluAvukatId: string | null;
  uyapVekilIdleri: string[];
}) {
  const [sorumlu, setSorumlu] = useState(sorumluAvukatId ?? "");
  const [vekiller, setVekiller] = useState(new Set(uyapVekilIdleri));
  const [hata, setHata] = useState<string | null>(null);
  const [beklemede, baslat] = useTransition();

  // Sorumlu avukat pasif/listede yoksa bile secili deger gorunsun.
  const liste = avukatlar;

  function sorumluDegisti(id: string) {
    const onceki = sorumlu;
    setSorumlu(id);
    setHata(null);
    baslat(async () => {
      try {
        await sorumluAvukatiGuncelle(dosyaId, id);
      } catch (e) {
        setSorumlu(onceki);
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      }
    });
  }

  function vekilDegisti(id: string, kayitli: boolean) {
    setHata(null);
    setVekiller((o) => {
      const y = new Set(o);
      if (kayitli) y.add(id);
      else y.delete(id);
      return y;
    });
    baslat(async () => {
      try {
        await uyapVekilDurumunuGuncelle(dosyaId, id, kayitli);
      } catch (e) {
        setVekiller((o) => {
          const y = new Set(o);
          if (kayitli) y.delete(id);
          else y.add(id);
          return y;
        });
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      }
    });
  }

  return (
    <div className={beklemede ? "opacity-80" : undefined}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,18rem)_1fr]">
        <div className="alan-hucre">
          <label htmlFor="sorumlu-avukat" className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--link)]">
            Sorumlu avukat
          </label>
          <select
            id="sorumlu-avukat"
            value={sorumlu}
            onChange={(e) => sorumluDegisti(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]"
          >
            <option value="">Seçilmedi</option>
            {liste.map((a) => (
              <option key={a.id} value={a.id}>
                {a.adSoyad}
              </option>
            ))}
          </select>
        </div>
        <div className="alan-hucre">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--link)]">
            UYAP’ta vekil kayıtlı avukatlar
          </span>
          {liste.length === 0 ? (
            <p className="mt-1 text-sm text-white/55">Tanımlı avukat yok.</p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1.5">
              {liste.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-center gap-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={vekiller.has(a.id)}
                    onChange={(e) => vekilDegisti(a.id, e.target.checked)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  {a.adSoyad}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      {hata && <p className="mt-2 text-sm text-[#ff7a70]">{hata}</p>}
    </div>
  );
}
