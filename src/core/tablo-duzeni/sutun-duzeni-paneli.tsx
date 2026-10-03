"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Dugme } from "@/core/ui/button";
import { TabloSutunListesi, type TabloSutunSatiri } from "@/core/tablo-duzeni/tablo-sutun-listesi";

// Dosyalar gibi bir liste sayfasindan AYRILMADAN sutun sirasini/gorunurlugunu
// duzenleyebilmek icin - Ayarlar > Sutun Duzeni'ndeki ayni bileseni
// (TabloSutunListesi) burada acilir bir panel icinde tekrar kullanir.
//
// Panel body'ye portal ile cizilir ve OPAK zemin kullanir: "glass" (yari saydam
// + backdrop-filter) bir acilir menu, arkasindaki tablo satirlari/basliklari
// icinden gorunur olup ustuste biniyordu; ayrica tablonun kendi glass
// katmani (transform/isolation) paneli kesebiliyordu.
export function SutunDuzeniPaneli({
  tabloAnahtari,
  ogeler,
}: {
  tabloAnahtari: string;
  ogeler: TabloSutunSatiri[];
}) {
  const [konum, setKonum] = useState<{ top: number; right: number } | null>(null);
  const dugmeKabiRef = useRef<HTMLDivElement>(null);

  function degistir() {
    if (konum) {
      setKonum(null);
      return;
    }
    const kutu = dugmeKabiRef.current?.getBoundingClientRect();
    if (!kutu) return;
    setKonum({ top: kutu.bottom + 8, right: window.innerWidth - kutu.right });
  }

  return (
    <div ref={dugmeKabiRef} className="relative">
      <Dugme type="button" varyant="ikincil" onClick={degistir}>
        Sütunları Düzenle
      </Dugme>
      {konum &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setKonum(null)} />
            <div
              className="popover fixed z-[101] max-h-[80vh] w-80 overflow-y-auto rounded-2xl p-3"
              style={{ top: konum.top, right: konum.right }}
            >
              <p className="mb-2 px-1 text-xs text-white/55">
                Sütunları sürükleyerek sıralayın, ihtiyacınız olmayanı gizleyin.
              </p>
              <TabloSutunListesi tabloAnahtari={tabloAnahtari} ogeler={ogeler} />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
