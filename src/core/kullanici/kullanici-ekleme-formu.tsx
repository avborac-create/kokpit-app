"use client";

import { useRef, useState } from "react";
import { kullaniciEkle } from "@/core/kullanici/admin-actions";
import { ROL_ETIKETLERI } from "@/core/kullanici/kullanici-satiri";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";

export function KullaniciEklemeFormu() {
  const formRef = useRef<HTMLFormElement>(null);
  const [hata, setHata] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setHata(null);
        try {
          await kullaniciEkle(formData);
          formRef.current?.reset();
        } catch (err) {
          setHata(err instanceof Error ? err.message : "İşlem başarısız oldu.");
        }
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
    >
      <Alan>
        <Etiket htmlFor="adSoyad">Ad Soyad</Etiket>
        <Girdi id="adSoyad" name="adSoyad" required />
      </Alan>
      <Alan>
        <Etiket htmlFor="eposta">E-posta</Etiket>
        <Girdi id="eposta" name="eposta" type="email" required />
      </Alan>
      <Alan>
        <Etiket htmlFor="sifre">Şifre</Etiket>
        <Girdi id="sifre" name="sifre" type="password" minLength={8} required />
      </Alan>
      <Alan>
        <Etiket htmlFor="rol">Rol</Etiket>
        <Secim id="rol" name="rol" defaultValue="PERSONEL">
          {Object.entries(ROL_ETIKETLERI).map(([deger, etiket]) => (
            <option key={deger} value={deger}>
              {etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <div className="mb-4">
        <GonderButonu bekleyenMetin="Ekleniyor…">+ Kullanıcı Ekle</GonderButonu>
      </div>
      {hata && <p className="-mt-2 text-sm text-[#ff7a70] sm:col-span-2 lg:col-span-5">{hata}</p>}
    </form>
  );
}
