"use client";

import { useActionState } from "react";
import type { DavaDosyasiFormDurumu } from "@/modules/dava-dosyasi/lib/actions";

const BASLANGIC_DURUMU: DavaDosyasiFormDurumu = { hata: null };

// DavaDosyasiFormu'nun (async Server Component) etrafini saran ince bir
// istemci kabugu. action dogrudan <form action={...}> olarak baglanip
// validasyon hatalarinda throw ederse, hata en yakin error.tsx sinirina
// dusup TUM segmenti yeniden render eder - kullanicinin forma girdigi
// butun veri (musteri secimi, karsi taraf cipleri, metin alanlari) DOM'dan
// silinir (bkz. kullanici geri bildirimi). Bunu onlemek icin actions.ts
// artik validasyon hatalarini THROW ETMEK yerine DEGER olarak dondurur
// (Next'in kendi onerdigi "expected errors as return values" deseni, bkz.
// node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md) -
// throw edilen bir Error, useActionState ile istemciden cagrilan bir Server
// Action sinirini gectiginde React tarafindan dev/prod fark etmeksizin
// "Minified React error #441" gibi genel/redakte bir mesaja donusuyor;
// düz deger donmek formu hic unmount etmeden dogru mesaji gostermemizi
// saglar. redirect() basari durumunda oldugu gibi calismaya devam eder -
// onun ozel "hatasi" Next tarafindan burada hic gorunmeden ele alinir.
export function DavaDosyasiFormKabugu({
  action,
  children,
}: {
  action: (durum: DavaDosyasiFormDurumu, formData: FormData) => DavaDosyasiFormDurumu | Promise<DavaDosyasiFormDurumu>;
  children: React.ReactNode;
}) {
  const [durum, formAction] = useActionState(action, BASLANGIC_DURUMU);

  return (
    <form action={formAction} className="max-w-xl">
      {durum.hata && (
        <div className="glass mb-4 rounded-2xl border border-[rgba(255,69,58,0.35)] bg-[var(--danger-soft)] p-4 text-sm text-[#ff7a70]">
          {durum.hata}
        </div>
      )}
      {children}
    </form>
  );
}
