"use client";

import { useEffect, useState, type ReactNode } from "react";

// Gorev ayrinti paneli: sol kenarindaki cubuktan surukleyerek genisletilip daraltilir; secilen genislik hatirlanir.
const ANAHTAR = "kokpit_gorev_panel_genisligi";
const EN_AZ = 360;
const VARSAYILAN = 500;

export function YanPanel({ children }: { children: ReactNode }) {
  const [genislik, setGenislik] = useState(VARSAYILAN);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const n = Number(localStorage.getItem(ANAHTAR));
        if (n >= EN_AZ) setGenislik(Math.min(n, window.innerWidth - 80));
      } catch {
        // saklanamazsa varsayilan genislik
      }
    });
  }, []);

  // Sayfa bosluğu (page.tsx'te xl:pr-[var(--yan-panel-w)]) panelle birlikte genisler.
  useEffect(() => {
    document.documentElement.style.setProperty("--yan-panel-w", `${genislik}px`);
    return () => {
      document.documentElement.style.removeProperty("--yan-panel-w");
    };
  }, [genislik]);

  function surukle(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const tasiyici = e.currentTarget;
    tasiyici.setPointerCapture(e.pointerId);
    let son = genislik;
    const tasi = (ev: PointerEvent) => {
      son = Math.max(EN_AZ, Math.min(window.innerWidth - ev.clientX, window.innerWidth - 80));
      setGenislik(son);
    };
    const birak = () => {
      tasiyici.removeEventListener("pointermove", tasi);
      tasiyici.removeEventListener("pointerup", birak);
      try {
        localStorage.setItem(ANAHTAR, String(Math.round(son)));
      } catch {
        // onemsiz
      }
    };
    tasiyici.addEventListener("pointermove", tasi);
    tasiyici.addEventListener("pointerup", birak);
  }

  return (
    <aside style={{ width: genislik }} className="fixed inset-y-0 right-0 z-50 max-w-full overflow-y-auto border-l border-white/15 bg-[var(--background-2)] p-4 shadow-2xl">
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Paneli sürükleyerek genişlet veya daralt"
        title="Sürükleyerek genişletin"
        onPointerDown={surukle}
        className="absolute inset-y-0 left-0 z-10 w-2 cursor-col-resize touch-none hover:bg-[var(--accent)]/50"
      />
      {children}
    </aside>
  );
}
