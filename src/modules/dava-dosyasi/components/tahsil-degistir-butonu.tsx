"use client";

import { useTransition } from "react";
import { Dugme } from "@/core/ui/button";
import { karsiTarafAlacagiTahsilDurumuDegistir } from "@/modules/dava-dosyasi/lib/actions";

export function TahsilDegistirButonu({
  alacakId,
  dosyaId,
  tahsilEdildiMi,
}: {
  alacakId: string;
  dosyaId: string;
  tahsilEdildiMi: boolean;
}) {
  const [beklemede, baslat] = useTransition();
  return (
    <Dugme
      type="button"
      varyant="ikincil"
      boyut="kompakt"
      disabled={beklemede}
      onClick={() => baslat(() => karsiTarafAlacagiTahsilDurumuDegistir(alacakId, dosyaId, !tahsilEdildiMi))}
    >
      {tahsilEdildiMi ? "Tahsili geri al" : "Tahsil edildi"}
    </Dugme>
  );
}
