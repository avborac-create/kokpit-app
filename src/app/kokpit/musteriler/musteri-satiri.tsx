"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

// Satira cift tiklayinca muvekkil sayfasina gider (link/dugme tiklamalari haric).
export function MusteriSatiri({ musteriId, children }: { musteriId: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <tr
      className="cursor-pointer border-t border-white/[0.06] hover:bg-white/[0.04]"
      title="Müvekkil sayfası için çift tıklayın"
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button")) return;
        router.push(`/kokpit/musteriler/${musteriId}`);
      }}
    >
      {children}
    </tr>
  );
}
