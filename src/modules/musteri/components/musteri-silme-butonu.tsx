"use client";

import { musteriSil } from "@/modules/musteri/lib/actions";
import { OnayliButon } from "@/core/ui/onayli-buton";

export function MusteriSilmeButonu({ musteriId }: { musteriId: string }) {
  return (
    <OnayliButon
      eylem={() => musteriSil(musteriId)}
      mesaj="Bu müvekkili, tüm para trafiği kayıtlarını ve Müvekkil Finans hareketlerini silmek istediğinize emin misiniz?"
    >
      Sil
    </OnayliButon>
  );
}
