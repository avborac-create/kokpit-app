"use client";

import { OnayliButon } from "@/core/ui/onayli-buton";
import { kullaniciSil } from "./actions";

export function KullaniciSilButonu({ id, adSoyad }: { id: string; adSoyad: string }) {
  return (
    <OnayliButon
      sifreIste
      mesaj={`${adSoyad} adlı kullanıcı kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`}
      eylem={(sifre) => kullaniciSil(id, sifre)}
    >
      Sil
    </OnayliButon>
  );
}
