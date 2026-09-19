"use client";

import { useRouter } from "next/navigation";
import { hacizRaporuSil } from "@/modules/haciz-raporu/lib/actions";
import { OnayliButon } from "@/core/ui/onayli-buton";

export function HacizRaporuSilmeButonu({ raporId }: { raporId: string }) {
  const router = useRouter();

  return (
    <OnayliButon
      eylem={async () => {
        await hacizRaporuSil(raporId);
        router.push("/kokpit/haciz-artcilari");
      }}
      mesaj="Bu haciz raporunu ve yüklenen tüm belgeleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
    >
      Sil
    </OnayliButon>
  );
}
