"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DOSYA_FILTRE_COOKIE } from "./filtre-sabitleri";

const FILTRE_ANAHTARLARI = ["arama", "durum", "musteri"];

// Dosyalar listesindeki arama/filtre, kullanici kendisi temizlemedikce
// korunur: dosyaya girip cikinca, baska sayfaya gidip donunce ya da uygulamayi
// kapatip acinca ayni filtre geri gelir. Filtre bir cookie'de tutulur ki
// sunucu ilk render'da (yanip sonmadan) uygulayabilsin; geri yukleme
// page.tsx'te yapilir. Bu bilesen sadece mevcut URL filtresini cookie'ye
// yazar ya da temizler. Temizleme: "?temizle=1" ya da bos arama+durum ile
// "Filtrele".
export function FiltreKaydedici() {
  const arama = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (arama.get("temizle")) {
      document.cookie = `${DOSYA_FILTRE_COOKIE}=; path=/; max-age=0; samesite=lax`;
      router.replace("/kokpit/dava-dosyalari");
      return;
    }
    // URL'de hic filtre anahtari yoksa (ör. sunucu henuz kayitli filtreye
    // yonlendirmeden onceki an) dokunma - sadece KULLANICI bir sey yaptiginda
    // (filtre uygula/temizle) cookie degisir.
    if (!FILTRE_ANAHTARLARI.some((anahtar) => arama.has(anahtar))) return;
    const aktif = new URLSearchParams();
    for (const anahtar of FILTRE_ANAHTARLARI) {
      const deger = arama.get(anahtar);
      if (deger) aktif.set(anahtar, deger);
    }
    const metin = aktif.toString();
    document.cookie = metin
      ? `${DOSYA_FILTRE_COOKIE}=${encodeURIComponent(metin)}; path=/; max-age=31536000; samesite=lax`
      : `${DOSYA_FILTRE_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }, [arama, router]);

  return null;
}
