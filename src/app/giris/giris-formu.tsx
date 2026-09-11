"use client";

import { useActionState } from "react";
import { girisYap } from "@/core/auth/actions";
import { Alan, Etiket, Girdi } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";

export function GirisFormu() {
  const [durum, formAction, beklemede] = useActionState(girisYap, undefined);

  return (
    <form action={formAction} className="w-full max-w-sm">
      <Alan>
        <Etiket htmlFor="eposta">E-posta</Etiket>
        <Girdi id="eposta" name="eposta" type="email" autoComplete="username" required />
      </Alan>
      <Alan>
        <Etiket htmlFor="sifre">Şifre</Etiket>
        <Girdi id="sifre" name="sifre" type="password" autoComplete="current-password" required />
      </Alan>
      {durum?.hata && <p className="mb-4 text-sm text-red-600">{durum.hata}</p>}
      <Dugme type="submit" disabled={beklemede} className="w-full">
        {beklemede ? "Giriş yapılıyor…" : "Giriş Yap"}
      </Dugme>
    </form>
  );
}
