"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dugme } from "./button";

// Silme gibi geri alinamaz islemler icin native confirm() ile onay isteyen,
// sonrasinda mevcut route'u yenileyen (router.refresh) kucuk bir buton.
//
// ONEMLI: Bir Server Action'i dogrudan <form action={...}> uzerinden
// cagirmak yerine burada onClick + router.refresh() kullaniyoruz. Nedeni:
// yonlendirme (redirect) YAPMAYAN Server Action'lar (orn. bir listeden tek
// bir satir silme) form ile cagrildiginda Next.js'in mevcut route'u
// otomatik yenilemesi bu projede guvenilir calismadi (DOM guncellenmiyordu).
// router.refresh() ile bu acikca garanti altina alinir. Yonlendirme yapan
// Server Action'lar icin (orn. tum kaydi silme) bu ekstra refresh zararsizdir.
export function OnayliButon({
  eylem,
  mesaj,
  varyant = "tehlike",
  className,
  children,
}: {
  eylem: () => Promise<void>;
  mesaj: string;
  varyant?: "birincil" | "ikincil" | "tehlike";
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [beklemede, baslatTransition] = useTransition();

  return (
    <Dugme
      type="button"
      varyant={varyant}
      className={className}
      disabled={beklemede}
      onClick={() => {
        if (!confirm(mesaj)) return;
        baslatTransition(async () => {
          try {
            await eylem();
            router.refresh();
          } catch (hata) {
            // Server action'in atttigi (ör. "bu kayitta finansal veri var,
            // silinemez" gibi) anlamli hatayi kullaniciya goster - aksi
            // halde islem sessizce basarisiz olur/genel bir hata ekranina
            // duserdi.
            alert(hata instanceof Error ? hata.message : "İşlem başarısız oldu.");
          }
        });
      }}
    >
      {children}
    </Dugme>
  );
}
