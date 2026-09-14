"use client";

import { useRouter } from "next/navigation";
import { davaDosyasiSil } from "@/modules/dava-dosyasi/lib/actions";
import { OnayliButon } from "@/core/ui/onayli-buton";

export function DavaDosyasiSilmeButonu({
  dosyaId,
  sonrasindaYonlendir,
}: {
  dosyaId: string;
  // Dosyanın kendi detay sayfasından silindiğinde artık var olmayan o
  // sayfada kalınamaz - bir listeye geri dönülür. Listeden (Dosyalar veya
  // müvekkil finans sayfası) silindiğinde ise kullanıcı olduğu yerde kalır,
  // satır listeden düşer.
  sonrasindaYonlendir?: string;
}) {
  const router = useRouter();

  return (
    <OnayliButon
      eylem={async () => {
        await davaDosyasiSil(dosyaId);
        if (sonrasindaYonlendir) router.push(sonrasindaYonlendir);
      }}
      mesaj="Bu dava dosyasını silmek istediğinize emin misiniz? Dosyaya bağlı para trafiği kayıtları silinmez, sadece dosya bağlantısı kalkar."
    >
      Sil
    </OnayliButon>
  );
}
