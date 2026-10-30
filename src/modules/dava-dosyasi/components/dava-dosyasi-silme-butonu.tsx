"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { davaDosyasiSil, paraTrafigiSilmeSecenegiVarMi } from "@/modules/dava-dosyasi/lib/actions";
import { OnayliButon } from "@/core/ui/onayli-buton";

export function DavaDosyasiSilmeButonu({
  dosyaId,
  sonrasindaYonlendir,
  boyut = "normal",
  simge = false,
}: {
  dosyaId: string;
  // Dosyanın kendi detay sayfasından silindiğinde artık var olmayan o
  // sayfada kalınamaz - bir listeye geri dönülür. Listeden (Dosyalar veya
  // müvekkil finans sayfası) silindiğinde ise kullanıcı olduğu yerde kalır,
  // satır listeden düşer.
  sonrasindaYonlendir?: string;
  boyut?: "normal" | "kompakt";
  // Listelerde yer kazanmak icin yalnizca cop kutusu simgesi gosterir.
  simge?: boolean;
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
      className={simge ? "!px-2" : undefined}
    >
      {simge ? (
        <>
          <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5" />
          </svg>
          <span className="sr-only">Sil</span>
        </>
      ) : (
        "Sil"
      )}
    </OnayliButon>
  );
}
