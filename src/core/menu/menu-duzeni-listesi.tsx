"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { menuYenidenSirala, menuGorunurlukDegistir } from "@/core/menu/actions";

export type MenuOgesiSatiri = { anahtar: string; ad: string; gizliMi: boolean; sabitMi: boolean };

export function MenuDuzeniListesi({ ogeler: baslangic }: { ogeler: MenuOgesiSatiri[] }) {
  const [ogeler, setOgeler] = useState(baslangic);
  const [, startTransition] = useTransition();
  const [suruklenenAnahtar, setSuruklenenAnahtar] = useState<string | null>(null);

  // Surukleme sirasinda dragEnter cok sik tetiklenip state'i guncelledigi
  // icin, onDrop anindaki en guncel sirayi (React state closure'inin
  // bayatlamasindan bagimsiz) garanti almak icin bir ref tutulur.
  const ogelerRef = useRef(ogeler);
  useEffect(() => {
    ogelerRef.current = ogeler;
  }, [ogeler]);

  function uzerineGelince(hedefAnahtar: string) {
    if (!suruklenenAnahtar || suruklenenAnahtar === hedefAnahtar) return;
    setOgeler((onceki) => {
      const kaynakIndex = onceki.findIndex((o) => o.anahtar === suruklenenAnahtar);
      const hedefIndex = onceki.findIndex((o) => o.anahtar === hedefAnahtar);
      if (kaynakIndex === -1 || hedefIndex === -1) return onceki;
      const yeni = [...onceki];
      const [tasinan] = yeni.splice(kaynakIndex, 1);
      yeni.splice(hedefIndex, 0, tasinan);
      return yeni;
    });
  }

  function gorunurlukDegistir(anahtar: string, gizliMi: boolean) {
    setOgeler((onceki) => onceki.map((o) => (o.anahtar === anahtar ? { ...o, gizliMi } : o)));
    startTransition(() => {
      menuGorunurlukDegistir(anahtar, gizliMi);
    });
  }

  return (
    <div className="glass flex flex-col gap-1 rounded-2xl p-2">
      {ogeler.map((oge) => (
        <div
          key={oge.anahtar}
          draggable
          onDragStart={() => setSuruklenenAnahtar(oge.anahtar)}
          onDragEnter={() => uzerineGelince(oge.anahtar)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            setSuruklenenAnahtar(null);
            startTransition(() => {
              menuYenidenSirala(ogelerRef.current.map((o) => o.anahtar));
            });
          }}
          onDragEnd={() => setSuruklenenAnahtar(null)}
          className={`flex cursor-grab items-center justify-between rounded-xl px-4 py-3 transition-colors active:cursor-grabbing ${
            suruklenenAnahtar === oge.anahtar ? "opacity-40" : "hover:bg-white/[0.04]"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-white/25 select-none">⠿⠿</span>
            <span className={`text-sm font-medium ${oge.gizliMi ? "text-white/40" : "text-white"}`}>
              {oge.ad}
            </span>
          </div>
          {oge.sabitMi ? (
            <span className="text-xs text-white/30">Her zaman görünür</span>
          ) : (
            <button
              type="button"
              onClick={() => gorunurlukDegistir(oge.anahtar, !oge.gizliMi)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                oge.gizliMi
                  ? "bg-white/[0.08] text-white/50 hover:bg-white/[0.12]"
                  : "bg-[var(--accent-soft)] text-[#6db8ff]"
              }`}
            >
              {oge.gizliMi ? "Gizli" : "Görünür"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
