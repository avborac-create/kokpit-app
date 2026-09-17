"use client";

import { useEffect } from "react";
import { aktifBasligiAyarla } from "./sekme-deposu";

// Sunucu bilesenlerinin bile JSX cocugu olarak render edebilecegi, hicbir
// sey GORUNTULEMEYEN kucuk bir istemci bileseni: mount/guncellenme aninda
// aktif sekmenin basligini kaydin gercek adiyla (musteri adi, dosya
// konusu, grup adi vb.) EZER. Kullanmayan sayfalar otomatik olarak
// varsayilanSekmeBasligi()'nin urettigi genel modul adini kullanmaya
// devam eder - yeni bir modul bunu kullanmak ZORUNDA degildir.
export function SekmeBasligi({ baslik }: { baslik: string }) {
  useEffect(() => {
    aktifBasligiAyarla(baslik);
  }, [baslik]);

  return null;
}
