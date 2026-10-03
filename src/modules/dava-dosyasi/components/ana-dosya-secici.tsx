"use client";

import { useState, useTransition } from "react";
import { anaDosyaBagla } from "@/modules/dava-dosyasi/lib/actions";
import type { AnaDosyaAdayi } from "@/modules/dava-dosyasi/lib/queries";
import { kayitNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { Dugme } from "@/core/ui/button";
import { Girdi } from "@/core/ui/form";

// Turkce karakterleri sadelestirip kucuk harfe cevirir - "icra" yazinca
// "İcra", "ISPARTA" yazinca "Isparta" bulunsun diye.
function sadelestir(metin: string): string {
  return metin
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

function adayBasligi(a: AnaDosyaAdayi): string {
  return [kayitNoGoster(a.kayitNo), a.buroNo ? `BN-${a.buroNo}` : null, a.dosyaNo, a.konu]
    .filter(Boolean)
    .join(" · ");
}

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
  const [arama, setArama] = useState("");
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

  const sorgu = sadelestir(arama.trim());
  const filtreli = sorgu
    ? adaylar.filter((a) =>
        sadelestir(
          [adayBasligi(a), a.birimAdi, ...a.muvekkiller, ...a.karsiTaraflar].filter(Boolean).join(" "),
        ).includes(sorgu),
      )
    : adaylar;
  const seciliAday = adaylar.find((a) => a.id === secili);

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
      <Girdi
        type="search"
        value={arama}
        onChange={(e) => setArama(e.target.value)}
        placeholder="Ara: müvekkil, karşı taraf, Kokpit no, BN, dosya no, birim…"
        aria-label="Ana dosya ara"
        autoComplete="off"
      />
      {adaylar.length > 0 && (
        <ul className="max-h-72 divide-y divide-white/[0.06] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03]">
          {filtreli.map((a) => {
            const seciliMi = a.id === secili;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSecili(seciliMi ? "" : a.id)}
                  aria-pressed={seciliMi}
                  className={`block w-full px-3 py-2 text-left text-sm ${
                    seciliMi ? "bg-[var(--accent-soft)]" : "hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="block font-medium text-white/90">{adayBasligi(a)}</span>
                  {a.birimAdi && <span className="block text-xs text-white/45">{a.birimAdi}</span>}
                  <span className="block text-xs text-white/60">
                    <span className="text-white/35">Müvekkil: </span>
                    {a.muvekkiller.join(", ") || "—"}
                  </span>
                  <span className="block text-xs text-white/60">
                    <span className="text-white/35">Karşı taraf: </span>
                    {a.karsiTaraflar.join(", ") || "—"}
                  </span>
                </button>
              </li>
            );
          })}
          {filtreli.length === 0 && <li className="px-3 py-3 text-sm text-white/45">Eşleşen dosya yok.</li>}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Dugme type="button" boyut="kompakt" disabled={bekliyor || !secili} onClick={() => secili && calistir(secili)}>
          Alt dosya yap
        </Dugme>
        <span className="text-xs text-white/50">
          {seciliAday ? `Ana dosya: ${adayBasligi(seciliAday)}` : "Listeden bir ana dosya seçin."}
        </span>
      </div>
      {adaylar.length === 0 && (
        <p className="text-xs text-white/45">Aynı müvekkile ait, ana dosya olabilecek başka dosya yok.</p>
      )}
      {hata && <p className="text-sm text-[var(--danger)]">{hata}</p>}
    </div>
  );
}
