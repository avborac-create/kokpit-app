"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cikisYap } from "@/core/auth/actions";
import { Dugme } from "@/core/ui/button";
import { OneriButonu } from "@/core/oneri/oneri-butonu";
import { GorunumMenusu } from "@/core/gorunum/gorunum-menusu";
import { UYGULAMA_LOGOSU_YOLU } from "@/core/ui/marka";

// Apple'in kendi uygulamalarindaki (Ayarlar, Mail) master-detail deseni:
// telefon genisliginde (md altinda) tek seferde tek panel gorunur - modul
// listesi ya da secilen modulun icerigi, ikisi birden degil. md ve ustunde
// (tablet/masaustu) ikisi yan yana kalir. Hangi panelin gorunecegine mevcut
// rotaya bakarak (tam /kokpit mi, yoksa bir alt modul mu) karar verilir.
//
// kenarCubugu/ustBilgi artik ham veri (kullaniciAdSoyad/Rol/menuDuzeni/
// cmkDikkatSayisi) DEGIL, sunucuda ONCEDEN RENDER EDILMIS ReactNode olarak
// gelir - bkz. layout.tsx + kokpit-kabuk-verisi.tsx. Boylece bu veriyi
// cookies() ile okuyan (dolayisiyla "runtime veri" sayilan) kisim kendi
// <Suspense> sinirinda kalir, {children} (sayfa icerigi) onu beklemeden
// akar (bkz. Next.js "layout.js - Interaction with loading.js").
export function KokpitKabuk({
  children,
  kenarCubugu,
  ustBilgi,
}: {
  children: React.ReactNode;
  kenarCubugu: React.ReactNode;
  ustBilgi: React.ReactNode;
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
        {kenarCubugu}
      </aside>
      <div className={`min-h-0 min-w-0 flex-1 flex-col md:flex ${modulSeciliMi ? "flex" : "hidden"}`}>
        <header className="glass-strong relative z-30 flex h-12 shrink-0 items-center justify-between max-md:!rounded-none max-md:!border-x-0 max-md:!border-t-0 px-3 md:m-3 md:h-auto md:rounded-2xl md:px-6 md:py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/kokpit"
              className="-ml-1 inline-flex items-center gap-0.5 rounded-full py-1 pl-0.5 pr-2 text-[17px] font-normal tracking-tight text-[var(--link)] active:opacity-60 md:hidden"
            >
              <svg viewBox="0 0 12 20" className="h-[18px] w-[11px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 2 2 10l8 8" /></svg>
              Ana Sayfa
            </Link>
            {ustBilgi}
          </div>
          <div className="flex items-center gap-0.5 max-md:rounded-full max-md:bg-white/[0.07] max-md:p-0.5 md:gap-2">
            <OneriButonu />
            <GorunumMenusu />
            <form action={cikisYap}>
              <Dugme type="submit" varyant="ikincil" aria-label="Çıkış Yap" title="Çıkış Yap" className="!h-8 !w-8 !p-0  md:!h-auto md:!w-auto md:!px-4 md:!py-2">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] md:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" /></svg>
                <span className="hidden md:inline">Çıkış Yap</span>
              </Dugme>
            </form>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto px-3 pb-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
