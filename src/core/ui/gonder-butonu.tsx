"use client";

import { useFormStatus } from "react-dom";
import { Dugme } from "@/core/ui/button";

// Sunucu action'ina baglanan formlarda cift tiklama/cift gonderimi
// engellemek icin: form submit edilirken buton otomatik pasiflesir ve
// "Kaydediliyor..." gosterir. useFormStatus() sadece <form> icindeki
// (descendant) bilesenlerde calisir, bu yuzden bu bileşen dogrudan
// formun icinde kullanilmalidir.
export function GonderButonu({
  children,
  bekleyenMetin = "Kaydediliyor…",
  ...props
}: React.ComponentProps<typeof Dugme> & { bekleyenMetin?: string }) {
  const { pending } = useFormStatus();

  return (
    <Dugme {...props} type="submit" disabled={pending}>
      {pending ? bekleyenMetin : children}
    </Dugme>
  );
}
