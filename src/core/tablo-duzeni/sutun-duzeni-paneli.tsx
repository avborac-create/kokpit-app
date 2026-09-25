"use client";

import { useState } from "react";
import { Dugme } from "@/core/ui/button";
import { TabloSutunListesi, type TabloSutunSatiri } from "@/core/tablo-duzeni/tablo-sutun-listesi";

// Dosyalar gibi bir liste sayfasindan AYRILMADAN sutun sirasini/gorunurlugunu
// duzenleyebilmek icin - Ayarlar > Sutun Duzeni'ndeki ayni bileseni
// (TabloSutunListesi) burada acilir bir panel icinde tekrar kullanir.
export function SutunDuzeniPaneli({
  tabloAnahtari,
  ogeler,
}: {
  tabloAnahtari: string;
  ogeler: TabloSutunSatiri[];
}) {
  const [acikMi, setAcikMi] = useState(false);

  return (
    <div className="relative">
      <Dugme type="button" varyant="ikincil" onClick={() => setAcikMi((onceki) => !onceki)}>
        Sütunları Düzenle
      </Dugme>
      {acikMi && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAcikMi(false)} />
          <div className="glass absolute right-0 z-20 mt-2 w-80 rounded-2xl p-3 shadow-xl">
            <p className="mb-2 px-1 text-xs text-white/45">
              Sütunları sürükleyerek sıralayın, ihtiyacınız olmayanı gizleyin.
            </p>
            <TabloSutunListesi tabloAnahtari={tabloAnahtari} ogeler={ogeler} />
          </div>
        </>
      )}
    </div>
  );
}
