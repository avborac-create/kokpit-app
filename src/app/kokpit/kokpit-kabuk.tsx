"use client";

import { useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cikisYap } from "@/core/auth/actions";
import { Dugme } from "@/core/ui/button";
import { OneriButonu } from "@/core/oneri/oneri-butonu";
import { GeriButonu } from "@/core/ui/geri-butonu";
import { GorunumMenusu } from "@/core/gorunum/gorunum-menusu";
import { AsagiCekYenile } from "@/core/ui/asagi-cek-yenile";
import { YenileButonu } from "@/core/ui/yenile-butonu";
import { MarkaLogosu } from "@/core/ui/marka-logosu";
import { SutunBoyutlandirici } from "@/core/ui/sutun-boyutlandirici";

// Masaustunde sol menu daraltilabilir: daralinca yalniz renkli ikon seridi kalir.
// Tercih localStorage'da tutulur (useSyncExternalStore: SSR'da hep "genis").
const MENU_DAR_ANAHTARI = "kokpit-menu-dar";
const darDinleyicileri = new Set<() => void>();
function darOku(): boolean {
  try {
    return localStorage.getItem(MENU_DAR_ANAHTARI) === "1";
  } catch {
    return false;
  }
}
function darAbone(dinleyici: () => void) {
  darDinleyicileri.add(dinleyici);
  return () => darDinleyicileri.delete(dinleyici);
}
function darYaz(deger: boolean) {
  try {
    localStorage.setItem(MENU_DAR_ANAHTARI, deger ? "1" : "0");
  } catch {
    // localStorage erisilemez - sessizce yok say
  }
  darDinleyicileri.forEach((d) => d());
}

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
  const anaAlanRef = useRef<HTMLElement>(null);
  const modulSeciliMi = pathname !== "/kokpit";
  const dar = useSyncExternalStore(darAbone, darOku, () => false);

  return (
    <div className="flex min-h-0 flex-1">
      <aside
        data-dar={dar ? "true" : "false"}
        className={`glass group/menu m-3 max-md:mb-[max(env(safe-area-inset-bottom,0px),1.5rem)] grow min-h-0 shrink-0 flex-col rounded-[20px] md:mr-0 md:flex md:rounded-[10px] md:grow-0 ${
          dar ? "md:w-[76px]" : "md:w-60"
        } ${modulSeciliMi ? "hidden" : "flex"}`}
      >
        <div className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-5 md:group-data-[dar=true]/menu:flex-col md:group-data-[dar=true]/menu:gap-2 md:group-data-[dar=true]/menu:px-2">
          <MarkaLogosu boyut={40} className="shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 md:group-data-[dar=true]/menu:hidden">
            <p className="text-base font-semibold tracking-tight text-white">KOKPİT</p>
            <p className="text-sm text-white/45">Eces Hukuk Bürosu</p>
          </div>
          <button
            type="button"
            onClick={() => darYaz(!dar)}
            aria-label={dar ? "Menüyü genişlet" : "Menüyü daralt"}
            title={dar ? "Menüyü genişlet" : "Menüyü daralt"}
            className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white md:grid"
          >
            <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${dar ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
        </div>
        {kenarCubugu}
      </aside>
      <div className={`min-h-0 min-w-0 flex-1 flex-col md:flex ${modulSeciliMi ? "flex" : "hidden"}`}>
        <header className="glass-strong relative z-30 flex h-12 shrink-0 items-center justify-between max-md:!rounded-none max-md:!border-x-0 max-md:!border-t-0 px-3 md:m-3 md:h-auto md:rounded-[10px] md:px-6 md:py-3">
          <div className="flex items-center gap-3">
            <GeriButonu />
            <Link
              href="/kokpit"
              className="-ml-1 inline-flex items-center gap-0.5 rounded-full py-1 pl-0.5 pr-2 text-[17px] font-normal tracking-tight text-[var(--link)] active:opacity-60 md:hidden"
            >
              <svg viewBox="0 0 12 20" className="h-[18px] w-[11px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 2 2 10l8 8" /></svg>
              Ana Sayfa
            </Link>
            {ustBilgi}
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <YenileButonu />
            <Link
              href="/kokpit/bildirimler"
              aria-label="Bildirimler"
              title="Bildirimler"
              className="glass inline-flex h-8 w-8 items-center justify-center rounded-full text-white/85 outline-none transition-colors hover:bg-white/10 md:h-9 md:w-9"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 1 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9ZM10 20a2 2 0 0 0 4 0" /></svg>
            </Link>
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
        <main ref={anaAlanRef} className="min-w-0 flex-1 overflow-y-auto overscroll-y-contain px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:px-6 md:pb-6">
          {children}
        </main>
        <AsagiCekYenile hedef={anaAlanRef} />
        <SutunBoyutlandirici />
      </div>
    </div>
  );
}
