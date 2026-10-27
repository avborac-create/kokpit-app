"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { davaDosyasiSil, paraTrafigiSilmeSecenegiVarMi } from "@/modules/dava-dosyasi/lib/actions";
import { OnayliButon } from "@/core/ui/onayli-buton";

export function DavaDosyasiSilmeButonu({
  dosyaId,
  sonrasindaYonlendir,
  boyut = "normal",
}: {
  dosyaId: string;
  // Dosyanın kendi detay sayfasından silindiğinde artık var olmayan o
  // sayfada kalınamaz - bir listeye geri dönülür. Listeden (Dosyalar veya
  // müvekkil finans sayfası) silindiğinde ise kullanıcı olduğu yerde kalır,
  // satır listeden düşer.
  sonrasindaYonlendir?: string;
  boyut?: "normal" | "kompakt";
}) {
  const router = useRouter();
  // Para trafiği kayıtlarını da silme seçeneği yalnızca sistem yöneticisine görünür
  // (sunucu ayrıca doğrular).
  const [paraTrafigiSecenegi, setParaTrafigiSecenegi] = useState(false);
  useEffect(() => {
    paraTrafigiSilmeSecenegiVarMi().then(setParaTrafigiSecenegi, () => {});
  }, []);

  return (
    <OnayliButon
      sifreIste
      ekSecenekEtiketi={
        paraTrafigiSecenegi ? "Dosyaya bağlı para trafiği kayıtlarını da kalıcı olarak sil" : undefined
      }
      eylem={async (sifre, paraTrafiginiDeSil) => {
        const sonuc = await davaDosyasiSil(dosyaId, sifre, paraTrafiginiDeSil);
        if (sonuc.hata) return sonuc;
        if (sonrasindaYonlendir) router.push(sonrasindaYonlendir);
      }}
      mesaj="Bu dava dosyasını silmek istediğinize emin misiniz? Dosyaya bağlı para trafiği kayıtları silinmez, sadece dosya bağlantısı kalkar."
      boyut={boyut}
    >
      Sil
    </OnayliButon>
  );
}
