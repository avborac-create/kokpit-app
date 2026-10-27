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
        <td className="px-4 py-3 text-white/85">
          {acilabilir ? (
            <button type="button" aria-expanded={acik} className="flex items-center gap-2 text-left">
              <span className="inline-block w-3 text-xs text-white/50">{acik ? "▾" : "▸"}</span>
              {baslik}
            </button>
          ) : (
            <span className="ml-5 inline-block">{baslik}</span>
          )}
        </td>
        {hucreler}
      </tr>
      {acik && (
        <tr>
          <td colSpan={4} className="bg-black/20 px-4 py-4">
            {children}
          </td>
        </tr>
      )}
    </>
  );
}
