"use client";

import { irtibatKisisiSil } from "@/modules/musteri/lib/actions";
import { OnayliButon } from "@/core/ui/onayli-buton";

export function IrtibatKisisiSilmeButonu({
  musteriId,
  kisiId,
}: {
  musteriId: string;
  kisiId: string;
}) {
  return (
    <OnayliButon
      eylem={() => irtibatKisisiSil(musteriId, kisiId)}
      mesaj="Bu irtibat kişisini silmek istediğinize emin misiniz?"
      className="px-2 py-1 text-xs"
    >
      Sil
    </OnayliButon>
  );
}
