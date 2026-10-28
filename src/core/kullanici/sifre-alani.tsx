"use client";

import { useState } from "react";

// Sifre girdisi: yazilan sifreyi gosterme/gizleme ve rastgele sifre uretme.
// Kayitli (mevcut) sifreler tek yonlu sifrelendigi icin geri gosterilemez;
// bu alan yalnizca ŞU AN yazilan/uretilen yeni sifreyi gosterir.
const SIFRE_KARAKTERLERI = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function rastgeleSifreUret(uzunluk = 12): string {
  const baytlar = new Uint32Array(uzunluk);
  crypto.getRandomValues(baytlar);
  return Array.from(baytlar, (b) => SIFRE_KARAKTERLERI[b % SIFRE_KARAKTERLERI.length]).join("");
}

export function SifreAlani({
  id,
  name,
  deger,
  degisti,
  zorunlu = false,
  sinif,
}: {
  id: string;
  name?: string;
  deger?: string;
  degisti?: (yeni: string) => void;
  zorunlu?: boolean;
  sinif: string;
}) {
  const [ic, setIc] = useState("");
  const [gorunur, setGorunur] = useState(false);
  const denetimli = deger !== undefined;
  const mevcut = denetimli ? deger : ic;

  function yaz(yeni: string) {
    if (denetimli) degisti?.(yeni);
    else setIc(yeni);
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          id={id}
          name={name}
          type={gorunur ? "text" : "password"}
          value={mevcut}
          onChange={(e) => yaz(e.target.value)}
          required={zorunlu}
          minLength={8}
          autoComplete="new-password"
          className={sinif}
        />
        <button
          type="button"
          onClick={() => setGorunur((g) => !g)}
          className="whitespace-nowrap rounded-xl border border-white/15 bg-white/[0.06] px-3 text-xs text-white/80 hover:bg-white/[0.1]"
        >
          {gorunur ? "Gizle" : "Göster"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          yaz(rastgeleSifreUret());
          setGorunur(true);
        }}
        className="mt-1 text-xs text-[var(--accent)] hover:underline"
      >
        Rastgele şifre üret
      </button>
    </div>
  );
}
