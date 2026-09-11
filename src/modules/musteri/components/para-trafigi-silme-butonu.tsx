"use client";

import { paraTrafigiKaydiSil } from "@/modules/musteri/lib/actions";
import { OnayliButon } from "@/core/ui/onayli-buton";

export function ParaTrafigiSilmeButonu({
  musteriId,
  kayitId,
}: {
  musteriId: string;
  kayitId: string;
}) {
  return (
    <OnayliButon
      eylem={() => paraTrafigiKaydiSil(musteriId, kayitId)}
      mesaj="Bu para trafiği kaydını silmek istediğinize emin misiniz?"
      className="px-2 py-1 text-xs"
    >
      Sil
    </OnayliButon>
  );
}
