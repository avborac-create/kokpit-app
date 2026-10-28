"use client";

import { useActionState } from "react";
import { kullaniciOlustur } from "./actions";
import { BURO_ROLLERI, BURO_ROLU_ETIKETLERI, UYGULAMA_ROLU_ETIKETLERI, type UygulamaRolu } from "./rol-etiketleri";
import { SifreAlani } from "./sifre-alani";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";

const girdiSinifi =
  "glass w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/35 outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/40";

export function KullaniciFormu({ rolSecenekleri }: { rolSecenekleri: UygulamaRolu[] }) {
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
          <SifreAlani id="sifre" name="sifre" zorunlu sinif={girdiSinifi} />
        </Alan>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="rol">Uygulama Rolü</Etiket>
          <Secim id="rol" name="rol" required defaultValue="">
            <option value="" disabled>
              Seçiniz…
            </option>
            {rolSecenekleri.map((rol) => (
              <option key={rol} value={rol}>
                {UYGULAMA_ROLU_ETIKETLERI[rol]}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor="buroRolu">Büro Rolü</Etiket>
          <Secim id="buroRolu" name="buroRolu" required defaultValue="">
            <option value="" disabled>
              Seçiniz…
            </option>
            {BURO_ROLLERI.map((rol) => (
              <option key={rol} value={rol}>
                {BURO_ROLU_ETIKETLERI[rol]}
              </option>
            ))}
          </Secim>
        </Alan>
      </div>

      {durum?.hata && <p className="mb-4 text-sm text-[#ff7a70]">{durum.hata}</p>}
      <GonderButonu>Kullanıcı Oluştur</GonderButonu>
    </form>
  );
}
