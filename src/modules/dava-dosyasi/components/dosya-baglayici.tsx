"use client";

import { useState, useTransition } from "react";
import { dosyaBaglantisiniKaldir, dosyalariBagla, anaDosyaBagla } from "@/modules/dava-dosyasi/lib/actions";
import type { AnaDosyaAdayi } from "@/modules/dava-dosyasi/lib/queries";
import { kayitNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { Dugme } from "@/core/ui/button";
import { Girdi } from "@/core/ui/form";

// "icra" yazinca "İcra", "ISPARTA" yazinca "Isparta" bulunsun diye.
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

// Tek giris noktasi: "Dosyaları bağla" -> baglanacak dosyayi sec -> sistem
// "bu dosya ana mi alt mi olsun?" diye sorar: ANA / ALT / BİLMİYORUM.
// ANA ve ALT dosya agacini kurar (bkz. anaDosyaBagla); BİLMİYORUM yalniz
// "bagli dosya" isareti koyar (DavaDosyasi.bagliOlduguDosyaId), hiyerarsi
// sonra belirlenebilir. Adaylar ayni muvekkilin diger dosyalaridir.
export function DosyaBaglayici({
  dosyaId,
  mevcutAnaDosyaId,
  bagliOlduguDosya,
  adaylar,
}: {
  dosyaId: string;
  mevcutAnaDosyaId: string | null;
  bagliOlduguDosya: { id: string; etiket: string } | null;
  adaylar: AnaDosyaAdayi[];
}) {
  const [adim, setAdim] = useState<"kapali" | "sec" | "rol">("kapali");
  const [secili, setSecili] = useState("");
  const [arama, setArama] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, startTransition] = useTransition();

  function kapat() {
    setAdim("kapali");
    setSecili("");
    setArama("");
    setHata(null);
  }

  function calistir(is: () => Promise<unknown>) {
    setHata(null);
    startTransition(async () => {
      try {
        await is();
        kapat();
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

  return (
    <div className="flex flex-col gap-2">
      {adim === "kapali" && (
        <>
          {bagliOlduguDosya && (
            <p className="text-sm text-white/75">
              <span className="text-white/45">Bağlı dosya: </span>
              {bagliOlduguDosya.etiket}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Dugme type="button" boyut="kompakt" onClick={() => setAdim("sec")}>
              Dosyaları bağla
            </Dugme>
            {mevcutAnaDosyaId && (
              <Dugme
                type="button"
                varyant="ikincil"
                boyut="kompakt"
                disabled={bekliyor}
                onClick={() => calistir(() => anaDosyaBagla(dosyaId, null))}
              >
                Ana dosyadan ayır
              </Dugme>
            )}
            {bagliOlduguDosya && (
              <Dugme
                type="button"
                varyant="ikincil"
                boyut="kompakt"
                disabled={bekliyor}
                onClick={() => calistir(() => dosyaBaglantisiniKaldir(dosyaId))}
              >
                Bağı kaldır
              </Dugme>
            )}
          </div>
        </>
      )}

      {adim === "sec" && (
        <>
          <Girdi
            type="search"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Bağlanacak dosyayı ara: müvekkil, karşı taraf, Kokpit no, BN, dosya no, birim…"
            aria-label="Bağlanacak dosyayı ara"
            autoComplete="off"
            autoFocus
          />
          {adaylar.length > 0 ? (
            <ul className="max-h-72 divide-y divide-white/[0.06] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03]">
              {filtreli.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSecili(a.id);
                      setAdim("rol");
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-white/[0.06]"
                  >
                    <span className="block font-medium text-white/90">{adayBasligi(a)}</span>
                    {a.birimAdi && <span className="block text-xs text-white/55">{a.birimAdi}</span>}
                    <span className="block text-xs text-white/65">
                      <span className="text-white/40">Müvekkil: </span>
                      {a.muvekkiller.join(", ") || "—"}
                      <span className="text-white/40"> · Karşı taraf: </span>
                      {a.karsiTaraflar.join(", ") || "—"}
                    </span>
                  </button>
                </li>
              ))}
              {filtreli.length === 0 && <li className="px-3 py-3 text-sm text-white/55">Eşleşen dosya yok.</li>}
            </ul>
          ) : (
            <p className="text-sm text-white/55">Aynı müvekkile ait, bağlanabilecek başka dosya yok.</p>
          )}
          <div>
            <Dugme type="button" varyant="ikincil" boyut="kompakt" onClick={kapat}>
              Vazgeç
            </Dugme>
          </div>
        </>
      )}

      {adim === "rol" && seciliAday && (
        <>
          <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/85">
            <span className="text-white/45">Bağlanacak dosya: </span>
            {adayBasligi(seciliAday)}
          </p>
          <p className="text-base font-medium text-white">Bu dosya ana dosya mı, alt dosya mı olsun?</p>
          <div className="flex flex-wrap gap-2">
            <Dugme
              type="button"
              disabled={bekliyor}
              onClick={() => calistir(() => dosyalariBagla(dosyaId, seciliAday.id, "ANA"))}
            >
              ANA
            </Dugme>
            <Dugme
              type="button"
              disabled={bekliyor}
              onClick={() => calistir(() => dosyalariBagla(dosyaId, seciliAday.id, "ALT"))}
            >
              ALT
            </Dugme>
            <Dugme
              type="button"
              varyant="ikincil"
              disabled={bekliyor}
              onClick={() => calistir(() => dosyalariBagla(dosyaId, seciliAday.id, "BILMIYORUM"))}
            >
              BİLMİYORUM
            </Dugme>
            <Dugme type="button" varyant="ikincil" disabled={bekliyor} onClick={() => setAdim("sec")}>
              Geri
            </Dugme>
          </div>
        </>
      )}

      {hata && <p className="text-sm text-[var(--danger)]">{hata}</p>}
    </div>
  );
}
