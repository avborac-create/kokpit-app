"use client";

import { useState } from "react";

// Standart telefon girisi: solda sabit "+90" (ulke kodu zaten yazili, kullanici 0 yazmaz),
// yaninda "(5XX) XXX XX XX" kalibi. Yalniz rakam yazilir; bosluk/parantez kendiliginden gelir.
// Kaydedilen deger her yerde ayni: "+90 506 875 28 05" (bkz. modules/musteri/lib/telefon.ts).
// Yabanci numara icin alana "+" ile baslanir (ör. +49 170 1234567): kalip kapanir, oldugu gibi kalir.

const alanSinifi =
  "w-full min-w-0 bg-transparent px-3 py-2.5 text-white outline-none placeholder:text-white/35";

// "+90 506 875 28 05" -> "506875280 5" gibi yalniz rakamlar (ulusal 10 hane)
function ulusalRakamlar(kayitli: string): string {
  if (kayitli.startsWith("+") && !kayitli.startsWith("+90")) return "";
  let d = kayitli.replace(/\D/g, "");
  if (d.startsWith("90")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

function kalipla(d: string): string {
  if (!d) return "";
  const a = d.slice(0, 3);
  const bas = d.length < 3 ? `(${a}` : `(${a})`;
  const rest = [d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(" ");
  return rest ? `${bas} ${rest}` : bas;
}

function kayitliBicim(d: string): string {
  if (!d) return "";
  return `+90 ${[d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(" ")}`;
}

export function TelefonGirdisi({
  value,
  defaultValue = "",
  onChange,
  onBlur,
  name,
  id,
  tip = "CEP",
  required,
  className = "",
  "aria-label": ariaLabel,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (kayitli: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  name?: string;
  id?: string;
  tip?: string;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [ic, setIc] = useState(defaultValue);
  const kayitli = value ?? ic;
  const yabanci = kayitli.startsWith("+") && !kayitli.startsWith("+90");
  const d = ulusalRakamlar(kayitli);
  const gosterilen = yabanci ? kayitli : kalipla(d);

  function degistir(e: React.ChangeEvent<HTMLInputElement>) {
    // "+90 ..." yapistirilirsa ulusal kalip kullanilir (+90 zaten solda yazili)
    const metin = e.target.value.replace(/^\s*\+\s*90/, "");
    let yeni: string;
    if (metin.includes("+")) {
      // yabanci numara modu: "+" ile baslayan her sey oldugu gibi (yalniz rakam/bosluk/+)
      yeni = "+" + metin.replace(/[^\d ]/g, "").replace(/^\s+/, "");
      if (yeni === "+") yeni = "+";
    } else {
      let r = metin.replace(/\D/g, "");
      if (r.startsWith("90") && r.length > 10) r = r.slice(2);
      if (r.startsWith("0")) r = r.slice(1);
      r = r.slice(0, 10);
      // geri silerken ")" ya da bosluk silinirse bir rakam da dusur (yoksa kalip geri doner)
      if (r === d && metin.length < gosterilen.length) r = r.slice(0, -1);
      yeni = kayitliBicim(r);
    }
    e.currentTarget.setCustomValidity("");
    setIc(yeni);
    onChange?.(yeni);
  }

  const yer = tip === "SABIT" ? "(2XX) XXX XX XX" : "(5XX) XXX XX XX";
  return (
    <div className={`flex min-w-0 items-stretch overflow-hidden rounded-xl border border-white/15 bg-white/[0.06] focus-within:border-[var(--accent)] ${className}`}>
      {!yabanci && (
        <span className="flex select-none items-center border-r border-white/10 bg-white/[0.06] px-3 text-sm font-medium text-white/70" title="Ülke kodu otomatik; başına 0 yazmayın">
          +90
        </span>
      )}
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        required={required}
        aria-label={ariaLabel}
        placeholder={yabanci ? "+49 170 1234567" : yer}
        value={gosterilen}
        onChange={degistir}
        onBlur={onBlur}
        className={alanSinifi}
      />
      {name && <input type="hidden" name={name} value={kayitli} />}
    </div>
  );
}
