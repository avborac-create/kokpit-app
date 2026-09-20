"use client";

import { useActionState } from "react";
import type { KullaniciRolu } from "@prisma/client";
import { kullaniciOlustur } from "./actions";
import { ROL_ETIKETLERI } from "./rol-etiketleri";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";

export function KullaniciFormu({ rolSecenekleri }: { rolSecenekleri: KullaniciRolu[] }) {
  const [durum, formAction] = useActionState(kullaniciOlustur, undefined);

  return (
    <form action={formAction} className="max-w-xl">
      <Alan>
        <Etiket htmlFor="adSoyad">Ad Soyad</Etiket>
        <Girdi id="adSoyad" name="adSoyad" required autoComplete="off" />
      </Alan>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="eposta">E-posta</Etiket>
          <Girdi id="eposta" name="eposta" type="email" required autoComplete="off" />
        </Alan>
        <Alan>
          <Etiket htmlFor="sifre">Geçici Şifre</Etiket>
          <Girdi id="sifre" name="sifre" type="password" required minLength={8} autoComplete="new-password" />
        </Alan>
      </div>

      <Alan>
        <Etiket htmlFor="rol">Rol</Etiket>
        <Secim id="rol" name="rol" required defaultValue="">
          <option value="" disabled>
            Seçiniz…
          </option>
          {rolSecenekleri.map((rol) => (
            <option key={rol} value={rol}>
              {ROL_ETIKETLERI[rol]}
            </option>
          ))}
        </Secim>
      </Alan>

      {durum?.hata && <p className="mb-4 text-sm text-[#ff7a70]">{durum.hata}</p>}
      <GonderButonu>Kullanıcı Oluştur</GonderButonu>
    </form>
  );
}
