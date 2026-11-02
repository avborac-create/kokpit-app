"use client";

import { useEffect, useState } from "react";

const ESIK = 80;
// Hareket belirgin sekilde DIKEY degilse (yatay kaydirma, capraz hareket) yenileme hic devreye girmez.
const OLU_BOLGE = 14; // bu kadar piksel asagi cekilmeden gosterge cikmaz
const DIKEYLIK_ORANI = 2; // dikey hareket, yatay hareketin en az 2 kati olmali

// Dokunulan yer yatay kaydirilabilir bir alanin (ornegin genis tablo) icindeyse yenileme istenmez.
function yatayKaydirilabilirMi(hedef: EventTarget | null, kok: HTMLElement) {
  let n = hedef instanceof HTMLElement ? hedef : null;
  while (n && n !== kok) {
    if (n.scrollWidth > n.clientWidth + 1) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
    n = n.parentElement;
  }
  return false;
}

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
    let baslangicX = 0;
    let iptal = false;
    let son = 0;

    const basla = (e: TouchEvent) => {
      iptal = false;
      baslangic = el.scrollTop <= 0 && e.touches.length === 1 && !yatayKaydirilabilirMi(e.target, el) ? e.touches[0].clientY : null;
      baslangicX = e.touches[0]?.clientX ?? 0;
      son = 0;
    };
    const kaydir = (e: TouchEvent) => {
      if (baslangic === null || iptal) return;
      const fark = e.touches[0].clientY - baslangic;
      const yatay = Math.abs(e.touches[0].clientX - baslangicX);
      if (yatay > 10 && fark < yatay * DIKEYLIK_ORANI) {
        iptal = true; // yatay / capraz hareket: bu dokunus yenileme icin sayilmaz
        son = 0;
        setMesafe(0);
        return;
      }
      if (fark <= OLU_BOLGE) {
        son = 0;
        setMesafe(0);
        return;
      }
      son = Math.min((fark - OLU_BOLGE) * 0.5, ESIK + 16);
      setMesafe(son);
    };
    const bitir = () => {
      if (baslangic !== null && !iptal && son >= ESIK) {
        setYukleniyor(true);
        window.location.reload();
        return;
      }
      baslangic = null;
      iptal = false;
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
