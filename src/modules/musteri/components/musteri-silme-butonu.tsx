"use client";

import { musteriSil } from "@/modules/musteri/lib/actions";
import { OnayliButon } from "@/core/ui/onayli-buton";

export function MusteriSilmeButonu({ musteriId }: { musteriId: string }) {
  return (
    <OnayliButon
      eylem={() => musteriSil(musteriId)}
      mesaj="Bu müvekkili ve tüm para trafiği kayıtlarını silmek istediğinize emin misiniz?"
    >
      Sil
    </OnayliButon>
  );
}
