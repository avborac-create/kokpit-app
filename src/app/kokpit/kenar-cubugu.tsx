"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KullaniciRolu } from "@prisma/client";
import { MODUL_KAYIT_DEFTERI, type ModulTanimi } from "@/core/modul-kayit-defteri";
import {
  AnaSayfaIkonu,
  MuvekkillerIkonu,
  DosyalarIkonu,
  HukukDosyalariIkonu,
  CezaDosyalariIkonu,
  HacizArtcilariIkonu,
  MuvekkilFinansIkonu,
  OnerilerIkonu,
  AyarlarIkonu,
  OkKirilimIkonu,
} from "./kenar-cubugu-ikonlari";

const DOSYALAR_ACIK_ANAHTARI = "kokpit-sol-menu-dosyalar-acik";

// "Dosyalar" ac/kapa tercihini localStorage'da (harici bir "store")
// tutan minik bir useSyncExternalStore kaynagi - React'in effect icinde
// dogrudan setState cagirmayi onlemesi (react-hooks/set-state-in-effect)
// gerektirdigi icin, sayfa yenilense de tercihin kullanici dostu bicimde
// korunmasinin dogru yolu budur: sunucu anlik goruntusu hep `false`
// (SSR'da localStorage yok, hydration uyumsuzlugu olmaz), istemci mount
// olur olmaz gercek degere senkronize olur.
const dosyalarDinleyicileri = new Set<() => void>();

// null = kullanici hic ac/kapa yapmadi (henuz bir tercih kaydedilmedi) -
// bu durumda varsayilan, alttaki bir rota aktifse acik baslamaktir; "1"/"0"
// kullanicinin ACIKCA sectigi, rotadan bagimsiz kalici tercihtir (boylece
// kullanici aktif bir alt sayfadayken bile "Dosyalar"i kapatabilir).
function dosyalarDegeriOku(): boolean | null {
  try {
    const deger = localStorage.getItem(DOSYALAR_ACIK_ANAHTARI);
    return deger === null ? null : deger === "1";
  } catch {
    return null;
  }
}

function dosyalarDegeriYaz(deger: boolean) {
  try {
    localStorage.setItem(DOSYALAR_ACIK_ANAHTARI, deger ? "1" : "0");
  } catch {
    // localStorage erisilemez (gizli sekme vb.) - sessizce yok say
  }
  dosyalarDinleyicileri.forEach((dinleyici) => dinleyici());
}

function dosyalarAbone(dinleyici: () => void) {
  dosyalarDinleyicileri.add(dinleyici);
  return () => dosyalarDinleyicileri.delete(dinleyici);
}

// iOS Ayarlar uygulamasindaki bilgi mimarisi: modul listesi gibi degil,
// gunluk is akisi gibi hissettiren, sabit/kisa gruplarla ayrilmis bir sol
// menu (bkz. ARCHITECTURE.md "Sol Menü Yeniden Tasarımı"). Bolum
// baslik/hiyerarsisi BILEREK sabit kodlanir - hangi sayfanin hangi
// isimle/rolle var oldugu MODUL_KAYIT_DEFTERI'nden (tek veri kaynagi)
// okunur, ama grupla(n)ma burada, sunum katmaninda kurulur.
export function KenarCubugu({
  kullaniciRol,
  menuDuzeni,
  cmkDikkatSayisi = 0,
}: {
  kullaniciRol?: KullaniciRolu;
  menuDuzeni: { anahtar: string; gizliMi: boolean }[];
  // Ceza/CMK listesinde gercekten dikkat/islem gerektiren kayit sayisi
  // (yaklasan durusma + gecikmis sonraki kontrol) - bkz.
  // cmkOzetSayilariniHesapla. 0 ise rozet hic gosterilmez.
  cmkDikkatSayisi?: number;
}) {
  const yol = usePathname();
  const gizliSeti = new Set(menuDuzeni.filter((oge) => oge.gizliMi).map((oge) => oge.anahtar));
  const modulHaritasi = new Map(MODUL_KAYIT_DEFTERI.map((m) => [m.anahtar, m]));

  function gorunurMu(anahtar: string): boolean {
    const modul = modulHaritasi.get(anahtar);
    if (!modul) return false;
    if (gizliSeti.has(anahtar)) return false;
    if (modul.rolGorebilir && !(kullaniciRol && modul.rolGorebilir.includes(kullaniciRol))) return false;
    return true;
  }

  const hukukDosyalariAktifMi = yol.startsWith("/kokpit/dava-dosyalari");
  const dosyalarCocukAktifMi =
    yol.startsWith("/kokpit/dava-dosyalari") ||
    yol.startsWith("/kokpit/cmk-dosyalari") ||
    yol.startsWith("/kokpit/haciz-raporlari");
  const kayitliAcikMi = useSyncExternalStore(dosyalarAbone, dosyalarDegeriOku, () => null);
  const dosyalarAcikMi = kayitliAcikMi ?? dosyalarCocukAktifMi;

  function dosyalarAcKapa() {
    dosyalarDegeriYaz(!dosyalarAcikMi);
  }

  const anaSayfa = modulHaritasi.get("ana-sayfa")!;
  const ayarlar = gorunurMu("ayarlar") ? modulHaritasi.get("ayarlar") : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        <MenuBagi modul={anaSayfa} ikon={AnaSayfaIkonu} seciliMi={yol === "/kokpit"} />

        {(gorunurMu("musteriler") ||
          gorunurMu("dava-dosyalari") ||
          gorunurMu("cmk-dosyalari") ||
          gorunurMu("haciz-artcilari")) && <BolumBasligi>ÇALIŞMA</BolumBasligi>}
        {gorunurMu("musteriler") && (
          <MenuBagi modul={modulHaritasi.get("musteriler")!} ikon={MuvekkillerIkonu} seciliMi={yol.startsWith("/kokpit/musteriler")} />
        )}
        {(gorunurMu("dava-dosyalari") || gorunurMu("cmk-dosyalari") || gorunurMu("haciz-raporlari")) && (
          <>
            <button
              type="button"
              onClick={dosyalarAcKapa}
              aria-expanded={dosyalarAcikMi}
              aria-controls="dosyalar-alt-menu"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-white/65 outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#12151d]"
            >
              <DosyalarIkonu className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 truncate">Dosyalar</span>
              <OkKirilimIkonu
                className={`h-3.5 w-3.5 shrink-0 text-white/35 transition-transform ${dosyalarAcikMi ? "rotate-90" : ""}`}
              />
            </button>
            {dosyalarAcikMi && (
              <div id="dosyalar-alt-menu" className="flex flex-col gap-0.5 pl-4">
                {gorunurMu("dava-dosyalari") && (
                  <MenuBagi
                    modul={modulHaritasi.get("dava-dosyalari")!}
                    ikon={HukukDosyalariIkonu}
                    seciliMi={hukukDosyalariAktifMi}
                  />
                )}
                {gorunurMu("cmk-dosyalari") && (
                  <MenuBagi
                    modul={modulHaritasi.get("cmk-dosyalari")!}
                    ikon={CezaDosyalariIkonu}
                    seciliMi={yol.startsWith("/kokpit/cmk-dosyalari")}
                    rozetSayisi={cmkDikkatSayisi}
                  />
                )}
              </div>
            )}
          </>
        )}
        {gorunurMu("haciz-artcilari") && (
          <MenuBagi
            modul={modulHaritasi.get("haciz-artcilari")!}
            ikon={HacizArtcilariIkonu}
            seciliMi={yol.startsWith("/kokpit/haciz-artcilari")}
          />
        )}

        {gorunurMu("muvekkil-finans") && (
          <>
            <BolumBasligi>FİNANS</BolumBasligi>
            <MenuBagi
              modul={modulHaritasi.get("muvekkil-finans")!}
              ikon={MuvekkilFinansIkonu}
              seciliMi={yol.startsWith("/kokpit/muvekkil-finans")}
            />
          </>
        )}

        {gorunurMu("oneriler") && (
          <>
            <BolumBasligi>YÖNETİM</BolumBasligi>
            <MenuBagi
              modul={modulHaritasi.get("oneriler")!}
              ikon={OnerilerIkonu}
              seciliMi={yol.startsWith("/kokpit/oneriler")}
            />
          </>
        )}
      </nav>

      {ayarlar && (
        <div className="border-t border-white/10 p-3">
          <MenuBagi modul={ayarlar} ikon={AyarlarIkonu} seciliMi={yol.startsWith("/kokpit/ayarlar")} />
        </div>
      )}
    </div>
  );
}

// iOS Ayarlar'daki kisa grup basliklari: kucuk, dusuk kontrastli,
// tiklanamaz - sadece asagidaki ogeleri anlamca grupluyor.
function BolumBasligi({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-0.5 mt-4 px-3 text-[11px] font-medium uppercase tracking-wide text-white/35 first:mt-1">
      {children}
    </p>
  );
}

// Tum sol menu ogelerinin ortak gorsel dili: tek satir, rahat tiklanabilir
// yukseklik, ince ikon + etiket. Secili durum "parlak buyuk buton" DEGIL -
// hafif/yuvarlatilmis bir arka plan + beyaz metin + ikon mavi vurgusu
// (bkz. gorev tanimindaki tasarim ilkeleri).
function MenuBagi({
  modul,
  ikon: Ikon,
  seciliMi,
  rozetSayisi = 0,
}: {
  modul: ModulTanimi;
  ikon: (props: { className?: string }) => React.ReactElement;
  seciliMi: boolean;
  rozetSayisi?: number;
}) {
  if (!modul.aktif) {
    return (
      <span
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-white/30"
        title="Bu bölüm henüz geliştirilmedi"
      >
        <Ikon className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 truncate">{modul.ad}</span>
        <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium">Yakında</span>
      </span>
    );
  }

  return (
    <Link
      href={modul.yol}
      aria-current={seciliMi ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#12151d] ${
        seciliMi ? "bg-[var(--accent-soft)] text-white" : "text-white/65 hover:bg-white/[0.06]"
      }`}
    >
      <Ikon className={`h-[18px] w-[18px] shrink-0 ${seciliMi ? "text-[#6db8ff]" : ""}`} />
      <span className="flex-1 truncate font-medium">{modul.ad}</span>
      {rozetSayisi > 0 && (
        <span className="rounded-full bg-[var(--danger-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[#ff7a70]">
          {rozetSayisi}
        </span>
      )}
    </Link>
  );
}
