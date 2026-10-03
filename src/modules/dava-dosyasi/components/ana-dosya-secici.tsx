"use client";

import { useState, useTransition } from "react";
import { anaDosyaBagla } from "@/modules/dava-dosyasi/lib/actions";
import type { AnaDosyaAdayi } from "@/modules/dava-dosyasi/lib/queries";
import { kayitNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { Dugme } from "@/core/ui/button";
import { Secim } from "@/core/ui/form";

// Dosyayi baska bir dosyanin ALT dosyasi yapar ya da ayirir (bkz.
// DavaDosyasi.anaDosyaId). Adaylar sunucuda suzulur: ayni muvekkilin, kendisi
// ve alt dosyalari haric, zaten alt dosya olmayan dosyalar.
export function AnaDosyaSecici({
  dosyaId,
  mevcutAnaDosyaId,
  adaylar,
  altDosyasiVar,
}: {
  dosyaId: string;
  mevcutAnaDosyaId: string | null;
  adaylar: AnaDosyaAdayi[];
  altDosyasiVar: boolean;
}) {
  const [secili, setSecili] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, startTransition] = useTransition();

  function calistir(anaDosyaId: string | null) {
    setHata(null);
    startTransition(async () => {
      try {
        await anaDosyaBagla(dosyaId, anaDosyaId);
        setSecili("");
      } catch (e) {
        setHata(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
      }
    });
  }

  if (mevcutAnaDosyaId) {
    return (
      <div className="flex flex-col gap-2">
        <div>
          <Dugme type="button" varyant="ikincil" boyut="kompakt" disabled={bekliyor} onClick={() => calistir(null)}>
            Ana dosyadan ayır
          </Dugme>
        </div>
        <p className="text-xs text-white/45">Ayırınca dosya kendi Kokpit numarasına geri döner.</p>
        {hata && <p className="text-sm text-[var(--danger)]">{hata}</p>}
      </div>
    );
  }

  if (altDosyasiVar) {
    return (
      <p className="text-xs text-white/45">
        Bu dosyanın alt dosyaları olduğu için başka bir dosyanın altına alınamaz.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Secim value={secili} onChange={(e) => setSecili(e.target.value)} className="max-w-md">
          <option value="">Ana dosya seçin…</option>
          {adaylar.map((a) => (
            <option key={a.id} value={a.id}>
              {[kayitNoGoster(a.kayitNo), a.buroNo ? `BN-${a.buroNo}` : null, a.dosyaNo, a.konu]
                .filter(Boolean)
                .join(" · ")}
            </option>
          ))}
        </Secim>
        <Dugme type="button" boyut="kompakt" disabled={bekliyor} onClick={() => secili && calistir(secili)}>
          Alt dosya yap
        </Dugme>
      </div>
      {adaylar.length === 0 && (
        <p className="text-xs text-white/45">Aynı müvekkile ait, ana dosya olabilecek başka dosya yok.</p>
      )}
      {hata && <p className="text-sm text-[var(--danger)]">{hata}</p>}
    </div>
  );
}
