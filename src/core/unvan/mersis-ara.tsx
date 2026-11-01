"use client";

import { useState } from "react";

// "MERSİS'te ara": yazılan adı panoya kopyalar ve MERSİS firma sorgusunu yeni sekmede açar
// (MERSİS giriş ister; sonuçtaki tam ünvan forma elle yapıştırılır). Ad kutusu id ile ya da doğrudan metinle verilir.
const MERSIS_ADRESI = "https://mersis.ticaret.gov.tr";

export function MersisAra({ adAlaniId, ad }: { adAlaniId?: string; ad?: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);

  async function ac() {
    const metin = ad ?? (adAlaniId ? ((document.getElementById(adAlaniId) as HTMLInputElement | null)?.value ?? "") : "");
    try {
      if (metin.trim()) {
        await navigator.clipboard.writeText(metin.trim());
        setKopyalandi(true);
        setTimeout(() => setKopyalandi(false), 2500);
      }
    } catch {
      // Pano erişilemezse yalnız sayfayı aç.
    }
    window.open(MERSIS_ADRESI, "_blank", "noopener,noreferrer");
  }

  return (
    <button type="button" onClick={ac} className="text-sm text-[var(--link)] hover:underline">
      {kopyalandi ? "Ad kopyalandı, MERSİS açıldı" : "MERSİS’te ara ↗"}
    </button>
  );
}
