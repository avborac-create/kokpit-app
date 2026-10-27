"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type DosyaSeciciSecenegi = { id: string; etiket: string; ayrinti?: string };

const normalize = (s: string) => s.toLocaleLowerCase("tr").replace(/i̇/g, "i");

// Aranabilir dosya secici: yazdikca KP no, birim, dosya no, konu ve karsi taraf icinde arar;
// her secenekte dosyanin tam bilgisi gorunur. Form gonderiminde `name` alani secilen dosyanin id'sini tasir.
export function DosyaSecici({
  name,
  dosyalar,
  id,
  required = false,
  bosSecenek,
  placeholder = "Dosya ara veya seç…",
  defaultValue = "",
}: {
  name: string;
  dosyalar: DosyaSeciciSecenegi[];
  id?: string;
  required?: boolean;
  // Verilirse listenin basinda "secilmemis" secenegi cikar (ör. "Dosyasız (müvekkil havuzu)").
  bosSecenek?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  const [secili, setSecili] = useState(defaultValue);
  const etiketiBul = (kimlik: string) => dosyalar.find((d) => d.id === kimlik)?.etiket ?? "";
  const [metin, setMetin] = useState(() => etiketiBul(defaultValue));
  const [acik, setAcik] = useState(false);
  const [vurgu, setVurgu] = useState(0);
  const kapsayici = useRef<HTMLDivElement>(null);
  const girdi = useRef<HTMLInputElement>(null);

  const secenekler = useMemo(() => {
    const kelimeler = normalize(metin).split(/\s+/).filter(Boolean);
    // Secili bir dosyanin etiketi yazili iken tum liste gosterilir (degistirmek kolay olsun).
    const aramaYok = kelimeler.length === 0 || (secili !== "" && metin === etiketiBul(secili));
    const eslesen = aramaYok
      ? dosyalar
      : dosyalar.filter((d) => {
          const samanlik = normalize(`${d.etiket} ${d.ayrinti ?? ""}`);
          return kelimeler.every((k) => samanlik.includes(k));
        });
    return bosSecenek ? [{ id: "", etiket: bosSecenek } as DosyaSeciciSecenegi, ...eslesen] : eslesen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metin, dosyalar, secili, bosSecenek]);

  useEffect(() => {
    girdi.current?.setCustomValidity(required && !secili ? "Listeden bir dosya seçin." : "");
  }, [required, secili]);

  useEffect(() => {
    function disTik(e: MouseEvent) {
      if (!kapsayici.current?.contains(e.target as Node)) {
        setAcik(false);
        // Secim yapilmadan kapatildiysa: secili dosyanin adini geri yaz.
        setMetin((onceki) => (secili ? etiketiBul(secili) : bosSecenek && onceki === "" ? "" : onceki));
      }
    }
    document.addEventListener("mousedown", disTik);
    return () => document.removeEventListener("mousedown", disTik);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secili, bosSecenek, dosyalar]);

  function sec(kimlik: string) {
    setSecili(kimlik);
    setMetin(kimlik ? etiketiBul(kimlik) : "");
    setAcik(false);
  }

  return (
    <div ref={kapsayici} className="relative">
      <input
        ref={girdi}
        className="glass w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/35 outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/40"
        id={id}
        type="text"
        autoComplete="off"
        value={metin}
        placeholder={bosSecenek ?? placeholder}
        onFocus={(e) => {
          setAcik(true);
          e.currentTarget.select();
        }}
        onChange={(e) => {
          setMetin(e.target.value);
          setSecili("");
          setAcik(true);
          setVurgu(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAcik(true);
            setVurgu((v) => Math.min(v + 1, secenekler.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setVurgu((v) => Math.max(v - 1, 0));
          } else if (e.key === "Enter" && acik) {
            e.preventDefault();
            const hedef = secenekler[vurgu];
            if (hedef) sec(hedef.id);
          } else if (e.key === "Escape") {
            setAcik(false);
          }
        }}
        role="combobox"
        aria-expanded={acik}
        aria-controls={`${id ?? name}-liste`}
        aria-autocomplete="list"
      />
      <input type="hidden" name={name} value={secili} />
      {acik && (
        <div id={`${id ?? name}-liste`} role="listbox" className="absolute left-0 right-0 z-50 mt-1 max-h-72 min-w-[18rem] overflow-y-auto rounded-xl border border-white/15 bg-[var(--background-2)] p-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]">
          {secenekler.length === 0 && <p className="px-3 py-3 text-sm text-white/45">Eşleşen dosya yok.</p>}
          {secenekler.map((d, i) => (
            <button
              key={d.id || "bos"}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => sec(d.id)}
              onMouseEnter={() => setVurgu(i)}
              className={`block w-full rounded-lg px-3 py-2 text-left ${i === vurgu ? "bg-[var(--accent-soft)]" : ""} ${d.id === secili ? "ring-1 ring-[var(--accent)]" : ""}`}
            >
              <span className="block text-sm font-medium text-white">{d.etiket}</span>
              {d.ayrinti && <span className="block whitespace-normal text-xs leading-snug text-white/55">{d.ayrinti}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
