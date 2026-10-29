"use client";

import { useState, type ReactNode } from "react";

// Ozet tablosunda hesap satiri: tiklaninca altinda o hesabin defteri acilir
// (kayitlar, duzenle / sil). Defter sunucuda uretilip children olarak gelir.
export function AcilirHesapSatiri({
  baslik,
  hucreler,
  acilabilir,
  children,
}: {
  baslik: string;
  hucreler: ReactNode;
  acilabilir: boolean;
  children: ReactNode;
}) {
  const [acik, setAcik] = useState(false);
  return (
    <>
      <tr
        className={`border-t border-white/[0.06] ${acilabilir ? "cursor-pointer hover:bg-white/[0.04]" : ""}`}
        onClick={acilabilir ? () => setAcik((a) => !a) : undefined}
      >
        <td className="px-2 py-2 text-white/85 md:px-4 md:py-3">
          {acilabilir ? (
            <button type="button" aria-expanded={acik} className="flex items-start gap-1 text-left md:items-center md:gap-2">
              <span className="inline-block w-3 text-xs text-white/50">{acik ? "▾" : "▸"}</span>
              {baslik}
            </button>
          ) : (
            <span className="ml-4 inline-block md:ml-5">{baslik}</span>
          )}
        </td>
        {hucreler}
      </tr>
      {acik && (
        <tr>
          <td colSpan={4} className="bg-white/[0.025] px-1 pb-4 pt-1 md:px-4">
            <div className="ml-1 border-l-2 border-white/15 pl-2 md:ml-4 md:pl-4 opacity-90">{children}</div>
          </td>
        </tr>
      )}
    </>
  );
}
