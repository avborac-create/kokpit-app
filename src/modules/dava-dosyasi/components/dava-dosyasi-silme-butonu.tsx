"use client";

import { davaDosyasiSil } from "@/modules/dava-dosyasi/lib/actions";
import { OnayliButon } from "@/core/ui/onayli-buton";

export function DavaDosyasiSilmeButonu({ dosyaId }: { dosyaId: string }) {
  return (
    <OnayliButon
      eylem={() => davaDosyasiSil(dosyaId)}
      mesaj="Bu dava dosyasını silmek istediğinize emin misiniz? Dosyaya bağlı para trafiği kayıtları silinmez, sadece dosya bağlantısı kalkar."
    >
      Sil
    </OnayliButon>
  );
}
