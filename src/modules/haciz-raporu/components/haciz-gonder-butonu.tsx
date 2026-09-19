"use client";

import { useFormStatus } from "react-dom";
import { Dugme } from "@/core/ui/button";

// GonderButonu'nun (core/ui) ozel bir varyanti: o sadece formun kendi
// gonderim durumunu (useFormStatus) izler, ama bu formda ayrica "hala
// devam eden bir dosya yuklemesi var mi" durumu da gonderimi
// engellemeli - bu yuzden core bilesenini degistirmek yerine (baska
// formlari etkilemesin diye) burada ayri, kucuk bir varyant tanimlandi.
export function HacizGonderButonu({ dosyaYuklemeDevamEdiyorMu }: { dosyaYuklemeDevamEdiyorMu: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Dugme type="submit" disabled={pending || dosyaYuklemeDevamEdiyorMu}>
      {pending ? "Kaydediliyor…" : dosyaYuklemeDevamEdiyorMu ? "Dosyalar yükleniyor…" : "Haciz Raporunu Gönder"}
    </Dugme>
  );
}
