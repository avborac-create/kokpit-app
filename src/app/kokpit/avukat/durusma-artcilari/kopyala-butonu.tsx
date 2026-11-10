"use client";

import { useState } from "react";

export function KopyalaButonu({ metin }: { metin: string }) {
  const [tamam, setTamam] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(metin);
          setTamam(true);
          setTimeout(() => setTamam(false), 2000);
        } catch {
          setTamam(false);
        }
      }}
      className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15"
    >
      {tamam ? "Kopyalandı ✓" : "Metni kopyala"}
    </button>
  );
}
