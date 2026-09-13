"use client";

import { useState } from "react";

function bicimlendir(sayi: number): string {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(sayi);
}

// Odaklandiginda duz sayi (100000.5 gibi - eskisi gibi yazilir), odak
// kaybedince "100.000,5" + basina "₺" gorunur. Sunulan (hidden input)
// deger her zaman noktali-ondalikli duz sayi metnidir (sunucu tarafinin
// bekledigi format).
export function ParaGirdisi({
  name,
  id,
  defaultValue,
  required,
  className,
  placeholder = "0",
}: {
  name: string;
  id?: string;
  defaultValue?: string | number;
  required?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [odaklandi, setOdaklandi] = useState(false);
  const [metin, setMetin] = useState(
    defaultValue !== undefined && defaultValue !== "" ? String(defaultValue) : "",
  );

  const sayi = metin === "" ? null : Number(metin);
  const gecerliMi = sayi !== null && Number.isFinite(sayi);
  const gosterilenDeger = odaklandi ? metin : gecerliMi ? bicimlendir(sayi) : "";

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/35">
        ₺
      </span>
      <input
        type="text"
        inputMode="decimal"
        id={id}
        value={gosterilenDeger}
        onFocus={() => setOdaklandi(true)}
        onBlur={() => setOdaklandi(false)}
        onChange={(e) => setMetin(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder={placeholder}
        required={required}
        className={
          "glass w-full rounded-xl py-2 pl-7 pr-3 text-sm text-white placeholder-white/35 outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/40" +
          (className ? " " + className : "")
        }
      />
      <input type="hidden" name={name} value={gecerliMi ? metin : ""} />
    </div>
  );
}
