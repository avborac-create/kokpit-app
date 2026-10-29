"use client";

import { useEffect, useState } from "react";

const ESIK = 64;

// Ana ekrana eklenmis (standalone) uygulamada tarayicinin kendi "asagi cekip
// yenile" hareketi yoktur. Kaydirma alani en ustteyken parmakla asagi
// cekilirse sayfa bastan yuklenir (yeni yayinlanan surum de boylece gelir).
export function AsagiCekYenile({ hedef }: { hedef: React.RefObject<HTMLElement | null> }) {
  const [mesafe, setMesafe] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    const el = hedef.current;
    if (!el) return;
    let baslangic: number | null = null;
    let son = 0;

    const basla = (e: TouchEvent) => {
      baslangic = el.scrollTop <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
      son = 0;
    };
    const kaydir = (e: TouchEvent) => {
      if (baslangic === null) return;
      const fark = e.touches[0].clientY - baslangic;
      if (fark <= 0) {
        son = 0;
        setMesafe(0);
        return;
      }
      son = Math.min(fark * 0.5, ESIK + 16);
      setMesafe(son);
    };
    const bitir = () => {
      if (baslangic !== null && son >= ESIK) {
        setYukleniyor(true);
        window.location.reload();
        return;
      }
      baslangic = null;
      son = 0;
      setMesafe(0);
    };

    el.addEventListener("touchstart", basla, { passive: true });
    el.addEventListener("touchmove", kaydir, { passive: true });
    el.addEventListener("touchend", bitir);
    el.addEventListener("touchcancel", bitir);
    return () => {
      el.removeEventListener("touchstart", basla);
      el.removeEventListener("touchmove", kaydir);
      el.removeEventListener("touchend", bitir);
      el.removeEventListener("touchcancel", bitir);
    };
  }, [hedef]);

  if (mesafe <= 0 && !yukleniyor) return null;
  const hazir = mesafe >= ESIK;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center md:hidden"
      style={{ top: `calc(env(safe-area-inset-top, 0px) + 3.25rem + ${yukleniyor ? ESIK / 2 : mesafe / 2}px)` }}
    >
      <span className="glass-strong inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--link)]">
        <svg
          viewBox="0 0 24 24"
          className={`h-5 w-5 transition-transform ${yukleniyor ? "animate-spin" : ""}`}
          style={yukleniyor ? undefined : { transform: `rotate(${hazir ? 180 : (mesafe / ESIK) * 180}deg)` }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </span>
    </div>
  );
}
