"use client";

import { Dugme } from "@/core/ui/button";

// Server Action'ların attigi (form dogrulama hatalari gibi) hatalar bu
// segment altindaki her sayfaya (tum /kokpit rotalarina) yayilir - Next.js
// bunlari render hatalarıyla ayni error.tsx sinirina yonlendirir. Bu sinir
// olmadan hata konsola dusup varsayilan/generic bir hata sayfasina
// duserdi (bkz. ör. paraTrafigiKaydiEkle'deki dagitim-tasmasi kontrolu,
// davaDosyasiOlustur'deki "Dosya Kumesi secilmelidir" kontrolu). redirect()
// atan action'lar buraya hic dusmez - Next.js onlari ayrica ele alir.
//
// reset() segmenti bastan render eder (form sayfayi yeniden yukler gibi
// davranir) - hem "Tekrar Dene" hem "Kapat" ayni seyi yapar, ikisi de tek
// cikis yolu: burada gosterilecek "eski" bir sayfa hali yok.
export default function KokpitHataSiniri({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="pt-3">
      <div className="glass flex items-start justify-between gap-4 rounded-2xl border border-[rgba(255,69,58,0.35)] bg-[var(--danger-soft)] p-5">
        <div>
          <p className="text-sm font-medium text-[#ff7a70]">İşlem tamamlanamadı</p>
          <p className="mt-1 text-sm text-white/75">{error.message || "Beklenmeyen bir hata oluştu."}</p>
        </div>
        <button
          type="button"
          onClick={() => reset()}
          aria-label="Kapat"
          className="shrink-0 text-white/40 hover:text-white/70"
        >
          ✕
        </button>
      </div>
      <div className="mt-3">
        <Dugme varyant="birincil" onClick={() => reset()}>
          Tekrar Dene
        </Dugme>
      </div>
    </div>
  );
}
