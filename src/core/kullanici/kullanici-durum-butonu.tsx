"use client";

import { OnayliButon } from "@/core/ui/onayli-buton";
import { kullaniciDurumDegistir } from "./actions";

// Sunucu bileseninden (page.tsx) OnayliButon'a dogrudan bir ok fonksiyonu
// ("() => kullaniciDurumDegistir(...)") gecirilemez - Server Component'ten
// Client Component'e yalnizca "use server" ile isaretli fonksiyonlarin
// KENDISI aktarilabilir, onu saran yeni bir fonksiyon degil. Bu yuzden
// closure'i burada, zaten "use client" olan bu kucuk sarmalayicida kuruyoruz.
export function KullaniciDurumButonu({
  id,
  adSoyad,
  aktifMi,
}: {
  id: string;
  adSoyad: string;
  aktifMi: boolean;
}) {
  return (
    <OnayliButon
      varyant="ikincil"
      mesaj={
        aktifMi
          ? `${adSoyad} adlı kullanıcının girişini kapatmak istediğinize emin misiniz?`
          : `${adSoyad} adlı kullanıcının girişini tekrar açmak istediğinize emin misiniz?`
      }
      eylem={() => kullaniciDurumDegistir(id, !aktifMi)}
    >
      {aktifMi ? "Girişi Kapat" : "Girişi Aç"}
    </OnayliButon>
  );
}
