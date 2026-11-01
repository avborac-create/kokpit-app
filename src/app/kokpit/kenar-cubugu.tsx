"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BuroRolu, KullaniciRolu } from "@prisma/client";
import { MODUL_KAYIT_DEFTERI, type ModulTanimi } from "@/core/modul-kayit-defteri";
import {
  AnaSayfaIkonu,
  TakvimIkonu,
  GorevlerIkonu,
  MuvekkillerIkonu,
  HukukDosyalariIkonu,
  CezaDosyalariIkonu,
  OnerilerIkonu,
  AyarlarIkonu,
  OkKirilimIkonu,
} from "./kenar-cubugu-ikonlari";

// Son acilan modul: ana sayfaya (telefonda menu listesine) donuldugunde menude
// o modul isaretli kalir; kullanici nerede kaldigini hatirlar.
const SON_MODUL_ANAHTARI = "kokpit-son-modul";
function sonModulOku(): string | null {
  try {
    return localStorage.getItem(SON_MODUL_ANAHTARI);
  } catch {
    return null;
  }
}
function sonModulAbone() {
  return () => {};
}

// iOS Ayarlar uygulamasindaki bilgi mimarisi: modul listesi gibi degil,
// gunluk is akisi gibi hissettiren, sabit/kisa gruplarla ayrilmis bir sol
// menu (bkz. ARCHITECTURE.md "Sol Menü Yeniden Tasarımı"). Bolum
// baslik/hiyerarsisi BILEREK sabit kodlanir - hangi sayfanin hangi
// isimle/rolle var oldugu MODUL_KAYIT_DEFTERI'nden (tek veri kaynagi)
// okunur, ama grupla(n)ma burada, sunum katmaninda kurulur.
export function KenarCubugu({
  kullaniciRol,
  buroRolu,
  menuDuzeni,
  cmkDikkatSayisi = 0,
  bekleyenGorevSayisi = 0,
}: {
  kullaniciRol?: KullaniciRolu;
  buroRolu?: BuroRolu;
  menuDuzeni: { anahtar: string; gizliMi: boolean }[];
  // Ceza/CMK listesinde gercekten dikkat/islem gerektiren kayit sayisi
  // (yaklasan durusma + gecikmis sonraki kontrol) - bkz.
  // cmkOzetSayilariniHesapla. 0 ise rozet hic gosterilmez.
  cmkDikkatSayisi?: number;
  // Giris yapan kullanicinin acik bekleyen gorev sayisi (0 ise rozet gosterilmez).
  bekleyenGorevSayisi?: number;
}) {
  const yol = usePathname();
  const gizliSeti = new Set(menuDuzeni.filter((oge) => oge.gizliMi).map((oge) => oge.anahtar));
  const modulHaritasi = new Map(MODUL_KAYIT_DEFTERI.map((m) => [m.anahtar, m]));

  function gorunurMu(anahtar: string): boolean {
    const modul = modulHaritasi.get(anahtar);
    if (!modul) return false;
    if (gizliSeti.has(anahtar)) return false;
    if (modul.rolGorebilir && !(kullaniciRol && modul.rolGorebilir.includes(kullaniciRol))) return false;
    if (modul.buroRolGorebilir && !(buroRolu && modul.buroRolGorebilir.includes(buroRolu))) return false;
    return true;
  }

  const sonModul = useSyncExternalStore(sonModulAbone, sonModulOku, () => null);
  useEffect(() => {
    if (yol !== "/kokpit" && yol.startsWith("/kokpit/")) {
      try {
        localStorage.setItem(SON_MODUL_ANAHTARI, yol);
      } catch {
        // localStorage erisilemez - sessizce yok say
      }
    }
  }, [yol]);
  // Yalniz ana sayfadayken gecerli: son modulun yolu bu oge ile basliyorsa "son" sayilir.
  const sonVar = yol === "/kokpit" && !!sonModul;
  function sonMu(modulYol: string) {
    return sonVar && modulYol !== "/kokpit" && !!sonModul && (sonModul === modulYol || sonModul.startsWith(modulYol + "/"));
  }

  const anaSayfa = modulHaritasi.get("ana-sayfa")!;
  const ayarlar = gorunurMu("ayarlar") ? modulHaritasi.get("ayarlar") : undefined;
  const dosyaOgesiVar = gorunurMu("dava-dosyalari") || gorunurMu("cmk-dosyalari");
  const modulGrubuVar = gorunurMu("musteriler") || dosyaOgesiVar;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
        <Grup>
          <MenuBagi modul={anaSayfa} ikon={AnaSayfaIkonu} renk="#3b82f6" seciliMi={yol === "/kokpit"} telefondaSoluk={sonVar} />
          {gorunurMu("buro-takvimi") && (
            <MenuBagi modul={modulHaritasi.get("buro-takvimi")!} ikon={TakvimIkonu} renk="#ef6a5b" seciliMi={yol.startsWith("/kokpit/takvim")} sonMu={sonMu(modulHaritasi.get("buro-takvimi")!.yol)} />
          )}
          {gorunurMu("bekleyen-gorevler") && (
            <MenuBagi modul={modulHaritasi.get("bekleyen-gorevler")!} ikon={GorevlerIkonu} renk="#14b8c4" seciliMi={yol.startsWith("/kokpit/bekleyen-gorevler")} sonMu={sonMu(modulHaritasi.get("bekleyen-gorevler")!.yol)} rozetSayisi={bekleyenGorevSayisi} />
          )}
        </Grup>

        {modulGrubuVar && (
          <div className="flex flex-col gap-1.5">
            <BolumBasligi>Modüller</BolumBasligi>
            <Grup>
              {gorunurMu("musteriler") && (
                <MenuBagi modul={modulHaritasi.get("musteriler")!} ikon={MuvekkillerIkonu} renk="#8b6cf0" seciliMi={yol.startsWith("/kokpit/musteriler")} sonMu={sonMu(modulHaritasi.get("musteriler")!.yol)} />
              )}
              {gorunurMu("dava-dosyalari") && (
                <MenuBagi modul={modulHaritasi.get("dava-dosyalari")!} ikon={HukukDosyalariIkonu} renk="#e8a33d" seciliMi={yol.startsWith("/kokpit/dava-dosyalari")} sonMu={sonMu(modulHaritasi.get("dava-dosyalari")!.yol)} />
              )}
              {gorunurMu("cmk-dosyalari") && (
                <MenuBagi modul={modulHaritasi.get("cmk-dosyalari")!} ikon={CezaDosyalariIkonu} renk="#2fb58a" seciliMi={yol.startsWith("/kokpit/cmk-dosyalari")} sonMu={sonMu(modulHaritasi.get("cmk-dosyalari")!.yol)} rozetSayisi={cmkDikkatSayisi} />
              )}
            </Grup>
          </div>
        )}

        {gorunurMu("oneriler") && (
          <div className="flex flex-col gap-1.5">
            <BolumBasligi>Yönetim</BolumBasligi>
            <Grup>
              <MenuBagi modul={modulHaritasi.get("oneriler")!} ikon={OnerilerIkonu} renk="#d65db1" seciliMi={yol.startsWith("/kokpit/oneriler")} sonMu={sonMu(modulHaritasi.get("oneriler")!.yol)} />
            </Grup>
          </div>
        )}
      </nav>

      {ayarlar && (
        <div className="p-3 pt-0">
          <Grup>
            <MenuBagi modul={ayarlar} ikon={AyarlarIkonu} renk="#7a8597" seciliMi={yol.startsWith("/kokpit/ayarlar")} sonMu={sonMu(ayarlar.yol)} />
          </Grup>
        </div>
      )}
    </div>
  );
}

// Yuvarlak kose grup kutusu (iOS Ayarlar'daki "inset grouped" duzeni): satirlar
// tek kutuda, aralarinda ince ayirici cizgi.
function Grup({ children }: { children: React.ReactNode }) {
  return <div className="menu-grup overflow-hidden rounded-xl bg-white/[0.05]">{children}</div>;
}

function BolumBasligi({ children }: { children: React.ReactNode }) {
  return <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45 md:group-data-[dar=true]/menu:hidden">{children}</p>;
}

// Her modulun kendi rengi olan yuvarlak kare ikon + etiket + sag ok. Secili
// satir: grup icinde hafif dolgu; son acilan modul telefonda ayni sekilde isaretli kalir.
function MenuBagi({
  modul,
  ikon: Ikon,
  renk,
  seciliMi,
  sonMu = false,
  telefondaSoluk = false,
  rozetSayisi = 0,
}: {
  modul: ModulTanimi;
  ikon: (props: { className?: string }) => React.ReactElement;
  renk: string;
  seciliMi: boolean;
  // Ana sayfadayken son acilan modul (telefonda menu isaretli kalir).
  sonMu?: boolean;
  // Telefonda ana sayfa satiri isaretsiz kalir (son modul isaretlidir).
  telefondaSoluk?: boolean;
  rozetSayisi?: number;
}) {
  const kutu = (
    <span
      aria-hidden="true"
      className="relative grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white"
      style={{ backgroundColor: renk }}
    >
      <Ikon className="h-4 w-4" />
      {rozetSayisi > 0 && <span className="absolute -right-1 -top-1 hidden h-2.5 w-2.5 rounded-full bg-[#ff5f56] md:group-data-[dar=true]/menu:block" />}
    </span>
  );

  if (!modul.aktif) {
    return (
      <span className="menu-satir flex items-center gap-3 px-3 py-2.5 text-[15px] text-white/30 md:group-data-[dar=true]/menu:justify-center md:group-data-[dar=true]/menu:px-0" title="Bu bölüm henüz geliştirilmedi">
        <span className="opacity-40">{kutu}</span>
        <span className="flex-1 truncate md:group-data-[dar=true]/menu:hidden">{modul.ad}</span>
        <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium md:group-data-[dar=true]/menu:hidden">Yakında</span>
      </span>
    );
  }

  const secili = seciliMi || sonMu;
  const seciliSinif = telefondaSoluk
    ? "md:bg-white/[0.1] md:text-white text-white/85"
    : "bg-white/[0.1] text-white";
  return (
    <Link
      href={modul.yol}
      aria-current={seciliMi ? "page" : undefined}
      title={modul.ad}
      className={`menu-satir flex items-center gap-3 px-3 py-2.5 text-[15px] outline-none md:group-data-[dar=true]/menu:justify-center md:group-data-[dar=true]/menu:px-0 transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${
        secili ? seciliSinif : "text-white/85 hover:bg-white/[0.06]"
      }`}
    >
      {kutu}
      <span className="flex-1 truncate font-medium md:group-data-[dar=true]/menu:hidden">{modul.ad}</span>
      {rozetSayisi > 0 && (
        <span className="rounded-full md:group-data-[dar=true]/menu:hidden bg-[var(--danger-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[#ff7a70]">{rozetSayisi}</span>
      )}
      <OkKirilimIkonu className="h-3.5 w-3.5 shrink-0 text-white/30 md:group-data-[dar=true]/menu:hidden" />
    </Link>
  );
}
