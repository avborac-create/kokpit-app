"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KullaniciRolu } from "@prisma/client";
import { cikisYap } from "@/core/auth/actions";
import { Dugme } from "@/core/ui/button";
import { OneriButonu } from "@/core/oneri/oneri-butonu";
import { KenarCubugu } from "./kenar-cubugu";

const GENISLIK_ANAHTARI = "kokpit-sol-menu-genislik";
const VARSAYILAN_GENISLIK = 240;
const MIN_GENISLIK = 200;
const MAX_GENISLIK = 420;

// Sol menu genisligi tercihini localStorage'da tutan minik bir
// useSyncExternalStore kaynagi - kenar-cubugu.tsx'teki "Dosyalar" ac/kapa
// deposuyla ayni desen: sunucu anlik goruntusu hep `null` (SSR'da
// localStorage yok), istemci mount olur olmaz gercek degere senkronize olur.
const genislikDinleyicileri = new Set<() => void>();

function genislikDegeriOku(): number | null {
  try {
    const deger = localStorage.getItem(GENISLIK_ANAHTARI);
    if (deger === null) return null;
    const sayi = Number(deger);
    if (!Number.isFinite(sayi)) return null;
    return Math.min(MAX_GENISLIK, Math.max(MIN_GENISLIK, sayi));
  } catch {
    return null;
  }
}

function genislikDegeriYaz(deger: number) {
  const sinirli = Math.min(MAX_GENISLIK, Math.max(MIN_GENISLIK, Math.round(deger)));
  try {
    localStorage.setItem(GENISLIK_ANAHTARI, String(sinirli));
  } catch {
    // localStorage erisilemez (gizli sekme vb.) - sessizce yok say
  }
  genislikDinleyicileri.forEach((dinleyici) => dinleyici());
}

function genislikAbone(dinleyici: () => void) {
  genislikDinleyicileri.add(dinleyici);
  return () => genislikDinleyicileri.delete(dinleyici);
}

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

  const kayitliGenislik = useSyncExternalStore(genislikAbone, genislikDegeriOku, () => null);
  const genislik = kayitliGenislik ?? VARSAYILAN_GENISLIK;
  const [suruklenenGenislik, setSuruklenenGenislik] = useState<number | null>(null);
  const suruklemeRef = useRef<number | null>(null);
  const gosterilenGenislik = suruklenenGenislik ?? genislik;

  // Sag kenardan surukleyerek genisletme/daraltma: surukleme bitene kadar
  // sadece gorsel state (suruklenenGenislik) guncellenir, localStorage'a
  // (ve dolayisiyla diger sekmelere) tek seferde, pointerup'ta yazilir.
  function suruklemeBaslat(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const baslangicX = e.clientX;
    const baslangicGenislik = genislik;
    suruklemeRef.current = baslangicGenislik;
    setSuruklenenGenislik(baslangicGenislik);
    document.body.style.userSelect = "none";

    function devam(ev: PointerEvent) {
      const yeni = Math.min(MAX_GENISLIK, Math.max(MIN_GENISLIK, baslangicGenislik + (ev.clientX - baslangicX)));
      suruklemeRef.current = yeni;
      setSuruklenenGenislik(yeni);
    }

    function bitir() {
      window.removeEventListener("pointermove", devam);
      window.removeEventListener("pointerup", bitir);
      document.body.style.userSelect = "";
      if (suruklemeRef.current !== null) genislikDegeriYaz(suruklemeRef.current);
      suruklemeRef.current = null;
      setSuruklenenGenislik(null);
    }

    window.addEventListener("pointermove", devam);
    window.addEventListener("pointerup", bitir);
  }

  function genislikSifirla() {
    genislikDegeriYaz(VARSAYILAN_GENISLIK);
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside
        className={`glass relative m-3 grow min-h-0 shrink-0 flex-col rounded-3xl md:mr-0 md:flex md:w-[var(--sol-menu-genislik)] md:grow-0 ${
          modulSeciliMi ? "hidden" : "flex"
        }`}
        style={{ "--sol-menu-genislik": `${gosterilenGenislik}px` } as React.CSSProperties}
      >
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <p className="text-base font-semibold tracking-tight text-white">KOKPİT</p>
          <p className="text-sm text-white/45">Eces Hukuk Bürosu</p>
        </div>
        <KenarCubugu kullaniciRol={kullaniciRol} menuDuzeni={menuDuzeni} cmkDikkatSayisi={cmkDikkatSayisi} />
        <div
          onPointerDown={suruklemeBaslat}
          onDoubleClick={genislikSifirla}
          role="separator"
          aria-orientation="vertical"
          aria-label="Sol menü genişliğini sürükleyerek ayarla (çift tıklayınca sıfırlanır)"
          className="absolute inset-y-0 -right-1 z-10 hidden w-2 cursor-col-resize touch-none md:block"
        />
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
