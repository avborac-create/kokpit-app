import { Suspense } from "react";
import { KokpitKabuk } from "./kokpit-kabuk";
import { KenarCubuguVerisi, UstBilgiVerisi } from "./kokpit-kabuk-verisi";

// DIKKAT: bu layout artik BILEREK async DEGIL ve cookies()/DB okuyan hicbir
// seyi DOGRUDAN await ETMEZ - bkz. kokpit-kabuk-verisi.tsx basindaki not.
// Eskiden burada Promise.all ile kullanici/menu/cmk-ozet veriler
// bekleniyordu; bu, Next.js'in kendi dokumantasyonuna gore (layout.js
// "Interaction with loading.js") HER navigasyonu, o veriler gelene kadar
// TAMAMEN bloke ediyordu - loading.tsx'in vaat ettigi "aninda iskelet"
// hicbir zaman gorunmuyordu, kullanici tikladiginda ekran bir sure donuk
// kaliyordu (mobil/PWA'da hissedilir yavaslik). Simdi bu veriye bagli
// parcalar kendi kucuk <Suspense> sinirlarinda; {children} (asil sayfa)
// onlari beklemeden akar.
export default function KokpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <KokpitKabuk
      kenarCubugu={
        <Suspense fallback={<KenarCubuguIskeleti />}>
          <KenarCubuguVerisi />
        </Suspense>
      }
      ustBilgi={
        <Suspense fallback={<UstBilgiIskeleti />}>
          <UstBilgiVerisi />
        </Suspense>
      }
    >
      {children}
    </KokpitKabuk>
  );
}

function KenarCubuguIskeleti() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-xl bg-white/[0.06]" />
      ))}
    </div>
  );
}

function UstBilgiIskeleti() {
  return <div className="hidden h-4 w-32 animate-pulse rounded bg-white/[0.06] md:block" />;
}
