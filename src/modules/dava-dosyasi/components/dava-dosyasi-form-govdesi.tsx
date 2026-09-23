"use client";

import { useActionState } from "react";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import type { DavaDosyasiSonucu } from "@/modules/dava-dosyasi/lib/actions";

// DavaDosyasiFormu bir sunucu bileseni (veri cekiyor) oldugu icin
// useActionState'i orada kullanamayiz - form etiketini ve hata/gonderim
// durumunu buraya, kucuk bir istemci bilesenine tasiyoruz. Alan JSX'i
// (children) sunucuda uretilip buraya prop olarak gecer.
export function DavaDosyasiFormGovdesi({
  action,
  gonderButonuMetni,
  children,
}: {
  action: (oncekiDurum: DavaDosyasiSonucu, formData: FormData) => Promise<DavaDosyasiSonucu>;
  gonderButonuMetni: string;
  children: React.ReactNode;
}) {
  const [durum, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-2xl" autoComplete="off">
      {children}
      {durum?.hata && <p className="mb-4 text-sm text-[#ff7a70]">{durum.hata}</p>}
      <GonderButonu>{gonderButonuMetni}</GonderButonu>
    </form>
  );
}
