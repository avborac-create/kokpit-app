"use client";

import { useState } from "react";
import { Etiket, Girdi } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import { PARA_BIRIMLERI, davaDegeriToplamlari, toplamlariYaz, degerEtiketleri, bosEkstra, ekstralariAyikla, ilkTalep, paraBirimi, type ParaKodu, type TalepEkstrasi } from "@/modules/dava-dosyasi/lib/dava-degeri";

// Talep Sonucu tek bir serbest metin degil, davada istenen her kalemin
// (ör. "170.000 TL kıdem tazminatı", "... hususunun tespiti") AYRI bir
// madde olarak eklenip cikarilabildigi bir liste - KarsiTarafEkleyici'deki
// "yaz + Ekle" akisindan farkli olarak burada her madde DOGRUDAN
// duzenlenebilir bir metin kutusu (kaldirilamayan tekil bir kayit degil,
// serbestce yeniden yazilabilir). Sunucu tarafinda tum maddeler "\n" ile
// birlestirilip mevcut `talepSonucu` sutununa yazilir (bkz. actions.ts) -
// ayri bir tablo/migration gerektirmez.
// Dilekceden yapistirilan tek paragraflik neticeyi maddelere boler: once
// "1-", "2.", "3)", "(4)", "a)" gibi numaralandirmaya, numara yoksa satir
// sonlarina, o da yoksa ";" ve cumle sonlarina gore. "1.000.000" gibi
// binlik ayiracli sayilar numara sayilmaz (isaretten sonra bosluk sart).
export function talebiMaddelereBol(metin: string): string[] {
  const temiz = metin.replace(/\r/g, "").trim();
  const isaret = /(?:^|[\s;:])(?:\(\d{1,2}\)|\d{1,2}\s*[-–.)]|[a-zçğıöşü]\s*\))\s+(?=\S)/giu;
  let parcalar = temiz.split(isaret);
  if (parcalar.filter((p) => p.trim()).length < 2) {
    parcalar = temiz.split(/\n+/);
  }
  if (parcalar.filter((p) => p.trim()).length < 2) {
    parcalar = temiz.split(/;\s*|(?<=[.])\s+(?=[A-ZÇĞİÖŞÜ])/u);
  }
  return parcalar
    .map((p) => p.replace(/\s+/g, " ").trim().replace(/^[;,\-–.]+\s*|\s*;$/g, ""))
    .filter((p) => p && !/^(açıklanan|yukarıda arz ve izah edilen) (nedenlerle|sebeplerle)$/iu.test(p));
}

const sayiAl = (v: string) => (v.trim() === "" ? null : Math.max(0, Number(v.replace(",", ".")) || 0));
const secimAlani = "rounded-lg border border-white/15 bg-white/[0.06] px-1 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]";

export function TalepSonucuListesi({
  baslangicMaddeler = [],
  baslangicKalemler = [],
  etiket = "Talep Sonucu",
  icraMi = false,
}: {
  icraMi?: boolean;
  baslangicMaddeler?: string[];
  // Her maddenin ayni siradaki para birimi/tutar bilgisi (talepKalemleri).
  baslangicKalemler?: unknown;
  etiket?: string;
}) {
  const [maddeler, setMaddeler] = useState<string[]>(
    baslangicMaddeler.length > 0 ? baslangicMaddeler : [""],
  );
  const [ekstralar, setEkstralar] = useState<TalepEkstrasi[]>(() => {
    const k = ekstralariAyikla(baslangicKalemler);
    return (baslangicMaddeler.length > 0 ? baslangicMaddeler : [""]).map((_, i) => k[i] ?? bosEkstra());
  });

  const toplam = toplamlariYaz(davaDegeriToplamlari(maddeler, ekstralar));
  // Sunucuya: bos olmayan maddelerle ayni sirada para/tutar bilgisi (diger alanlar korunur).
  const kalemlerJson = JSON.stringify(maddeler.flatMap((m, i) => (m.trim() ? [ekstralar[i] ?? bosEkstra()] : [])));

  function guncelle(index: number, deger: string) {
    setMaddeler((liste) => liste.map((m, i) => (i === index ? deger : m)));
  }
  function ekstraGuncelle(index: number, kismi: Partial<TalepEkstrasi>) {
    setEkstralar((l) => l.map((e, i) => (i === index ? { ...e, ...kismi } : e)));
  }

  // Cok maddeli metin yapistirilirsa kutuya tek parca halinde degil, her
  // madde ayri kutuya yazilir. Tek satirlik yapistirma normal davranir.
  function yapistirildi(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const parcalar = talebiMaddelereBol(e.clipboardData.getData("text"));
    if (parcalar.length < 2) return;
    e.preventDefault();
    const bosMu = !maddeler[index]?.trim();
    const kes = bosMu ? index : index + 1;
    setMaddeler((liste) => [...liste.slice(0, kes), ...parcalar, ...liste.slice(index + 1)]);
    setEkstralar((l) => [...l.slice(0, kes), ...parcalar.map(() => bosEkstra()), ...l.slice(index + 1)]);
  }

  function ekle() {
    setMaddeler((liste) => [...liste, ""]);
    setEkstralar((l) => [...l, bosEkstra()]);
  }

  function kaldir(index: number) {
    if (maddeler.length > 1) {
      setMaddeler((liste) => liste.filter((_, i) => i !== index));
      setEkstralar((l) => l.filter((_, i) => i !== index));
    } else {
      setMaddeler([""]);
      setEkstralar([bosEkstra()]);
    }
  }

  return (
    <div className="mb-4">
      <Etiket>{etiket}</Etiket>
      <input type="hidden" name="talepKalemleriJson" value={kalemlerJson} />
      <div className="flex flex-col gap-2">
        {maddeler.map((madde, index) => {
          const e = ekstralar[index] ?? bosEkstra();
          const ilk = ilkTalep(madde, e);
          return (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-sm text-white/35">{index + 1}.</span>
              <select
                value={paraBirimi(madde, e)}
                onChange={(ev) => ekstraGuncelle(index, { para: ev.target.value as ParaKodu })}
                className={`${secimAlani} w-[4.5rem] shrink-0`}
                aria-label="Para birimi"
                title="Para birimi (TL / USD / EUR / GBP)"
              >
                {PARA_BIRIMLERI.map((p) => (
                  <option key={p.kod} value={p.kod}>
                    {p.simge} {p.ad}
                  </option>
                ))}
              </select>
              <input
                inputMode="decimal"
                value={e.tutar ?? (ilk > 0 ? String(ilk) : "")}
                onChange={(ev) => ekstraGuncelle(index, { tutar: sayiAl(ev.target.value) })}
                placeholder="Tutar"
                aria-label="Tutar"
                className={`${secimAlani} w-28 shrink-0 px-2 text-right tabular-nums`}
              />
              <Girdi
                value={madde}
                onChange={(ev) => guncelle(index, ev.target.value)}
                onPaste={(ev) => yapistirildi(index, ev)}
                placeholder={index === 0 ? degerEtiketleri(icraMi).yapistir : "Talep maddesi (ne için?)"}
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() => kaldir(index)}
                className="shrink-0 text-white/40 hover:text-[#ff7a70]"
                aria-label={`${index + 1}. maddeyi kaldır`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      {maddeler.map((m, i) => (m.trim() ? <input key={i} type="hidden" name="talepMaddeleri" value={m} /> : null))}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Dugme type="button" varyant="ikincil" onClick={ekle}>
          + Madde Ekle
        </Dugme>
        {toplam && (
          <span className="text-sm text-white/70">
            <span className="text-white/45">{degerEtiketleri(icraMi).toplam}: </span>
            <span className="font-semibold text-white">{toplam}</span>
          </span>
        )}
      </div>
    </div>
  );
}
