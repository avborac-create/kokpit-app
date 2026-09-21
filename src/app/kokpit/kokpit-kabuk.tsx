"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KullaniciRolu } from "@prisma/client";
import { cikisYap } from "@/core/auth/actions";
import { Dugme } from "@/core/ui/button";
import { OneriButonu } from "@/core/oneri/oneri-butonu";
import { UYGULAMA_LOGOSU_YOLU } from "@/core/ui/marka";
import { KenarCubugu } from "./kenar-cubugu";

// Apple'in kendi uygulamalarindaki (Ayarlar, Mail) master-detail deseni:
// telefon genisliginde (md altinda) tek seferde tek panel gorunur - modul
// listesi ya da secilen modulun icerigi, ikisi birden degil. md ve ustunde
// (tablet/masaustu) ikisi yan yana kalir. Hangi panelin gorunecegine mevcut
// rotaya bakarak (tam /kokpit mi, yoksa bir alt modul mu) karar verilir.
export function KokpitKabuk({
  children,
  kullaniciAdSoyad,
  kullaniciRol,
  menuDuzeni,
  cmkDikkatSayisi,
}: {
  children: React.ReactNode;
  kullaniciAdSoyad?: string;
  kullaniciRol?: KullaniciRolu;
  menuDuzeni: { anahtar: string; gizliMi: boolean }[];
  cmkDikkatSayisi?: number;
}) {
  const pathname = usePathname();
  const modulSeciliMi = pathname !== "/kokpit";

  return (
    <div className="flex min-h-0 flex-1">
      <aside
        className={`glass m-3 grow min-h-0 shrink-0 flex-col rounded-3xl md:mr-0 md:flex md:w-60 md:grow-0 ${
          modulSeciliMi ? "hidden" : "flex"
        }`}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-5">
          <Image
            src={UYGULAMA_LOGOSU_YOLU}
            alt=""
            width={36}
            height={36}
            className="shrink-0 rounded-xl"
          />
          <div>
            <p className="text-base font-semibold tracking-tight text-white">KOKPİT</p>
            <p className="text-sm text-white/45">Eces Hukuk Bürosu</p>
          </div>
        </div>
        <KenarCubugu kullaniciRol={kullaniciRol} menuDuzeni={menuDuzeni} cmkDikkatSayisi={cmkDikkatSayisi} />
      </aside>
      <div className={`min-h-0 min-w-0 flex-1 flex-col md:flex ${modulSeciliMi ? "flex" : "hidden"}`}>
        <header className="glass m-3 flex items-center justify-between rounded-2xl px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/kokpit"
              className="-ml-1 rounded-full px-2 py-1 text-sm font-medium text-[#6db8ff] hover:bg-white/10 md:hidden"
            >
              ‹ Ana Sayfa
            </Link>
            <div className="hidden text-sm text-white/75 md:block">
              {kullaniciAdSoyad}
              <span className="ml-2 whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#6db8ff]">
                {kullaniciRol}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <OneriButonu />
            <form action={cikisYap}>
              <Dugme type="submit" varyant="ikincil">
                Çıkış Yap
              </Dugme>
            </form>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
