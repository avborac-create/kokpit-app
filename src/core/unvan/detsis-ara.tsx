"use client";

import { useState } from "react";

// "DETSİS'te ara": kamu kurum/kuruluşları için. Yazılan adı panoya kopyalar, DETSİS'i yeni sekmede açar;
// bulunan kurumun DETSİS numarası forma elle yazılır.
const DETSIS_ADRESI = "https://detsis.gov.tr";

export function DetsisAra({ ad }: { ad: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);

  async function ac() {
    try {
      if (ad.trim()) {
        await navigator.clipboard.writeText(ad.trim());
        setKopyalandi(true);
        setTimeout(() => setKopyalandi(false), 2500);
      }
    } catch {
      // Pano erişilemezse yalnız sayfayı aç.
    }
    window.open(DETSIS_ADRESI, "_blank", "noopener,noreferrer");
  }

  return (
    <button type="button" onClick={ac} className="text-sm text-[var(--link)] hover:underline">
      {kopyalandi ? "Ad kopyalandı, DETSİS açıldı" : "DETSİS’te ara ↗"}
    </button>
  );
}
