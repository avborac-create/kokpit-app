"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

// Ozet tablosunda hesap satiri: tiklaninca altinda o hesabin defteri acilir
// (kayitlar, duzenle / sil). Defter sunucuda uretilip children olarak gelir.
export function AcilirHesapSatiri({
  baslik,
  hucreler,
  acilabilir,
  href,
  children,
}: {
  baslik: string;
  hucreler: ReactNode;
  acilabilir: boolean;
  // Hesabin kendi ekranina giden baglanti
  href?: string;
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
          {href && (
            <Link
              href={href}
              onClick={(e) => e.stopPropagation()}
              className="ml-2 whitespace-nowrap text-[11px] text-[var(--link)] hover:underline"
            >
              hesaba git →
            </Link>
          )}
        </td>
        {hucreler}
      </tr>
      {acik && (
        <tr>
          <td colSpan={4} className="bg-white/[0.025] px-0 pb-3 pt-1 md:px-4 md:pb-4">
            <div className="opacity-90 md:ml-4 md:border-l-2 md:border-white/15 md:pl-4">{children}</div>
          </td>
        </tr>
      )}
    </>
  );
}
