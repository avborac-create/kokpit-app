"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { davaDosyalariniListele } from "@/modules/dava-dosyasi/lib/queries";
import { Dugme } from "@/core/ui/button";
import { DavaDosyasiSilmeButonu } from "@/modules/dava-dosyasi/components/dava-dosyasi-silme-butonu";

type Dosya = Awaited<ReturnType<typeof davaDosyalariniListele>>[number];

// Sütun anahtarı -> hücre içeriği. Görünür sütun kümesi/sırası admin
// tarafında (Ayarlar > Sütun Düzeni) belirlenir - bu harita sadece NASIL
// render edileceğini tanımlar (bkz. dava-dosyalari/page.tsx).
const SUTUN_HUCRELERI: Record<string, (dosya: Dosya) => ReactNode> = {
  kayitNo: (dosya) => (
    <Link
      href={`/kokpit/dava-dosyalari/${dosya.id}`}
      className="truncate font-medium text-white hover:text-[#6db8ff] hover:underline"
    >
      KP-{String(dosya.kayitNo).padStart(4, "0")}
    </Link>
  ),
  buroNo: (dosya) => dosya.buroNo ?? "—",
  dosyaNo: (dosya) => dosya.dosyaNo ?? "—",
  tur: (dosya) => dosya.tur?.etiket ?? "—",
  birimAdi: (dosya) => dosya.birimAdi ?? "—",
  konu: (dosya) => dosya.konu,
  karsiTaraflar: (dosya) =>
    dosya.karsiTaraflar.length > 0 ? dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ") : "—",
  muvekkiller: (dosya) => dosya.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—",
  durum: (dosya) => (
    <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] text-[#6db8ff]">
      {dosya.durum.etiket}
    </span>
  ),
  sorumluAvukat: (dosya) => dosya.sorumluAvukat?.adSoyad ?? "—",
};

const VARSAYILAN_GENISLIK = 130;
const VARSAYILAN_GENISLIKLER: Record<string, number> = {
  kayitNo: 84,
  buroNo: 80,
  dosyaNo: 92,
  tur: 120,
  birimAdi: 128,
  konu: 220,
  karsiTaraflar: 150,
  muvekkiller: 150,
  durum: 96,
  sorumluAvukat: 120,
  islemler: 148,
};

const MIN_GENISLIK = 56;

// Bu ekrana ozel, tarayici basina (localStorage) bir tercih - "kullanici
// sutun genisliklerini elle ayarlayabilsin" talebi geregi kisiye ozel kalir
// (admin tarafindaki sutun SIRASI/gorunurlugu ise ayri, ortak bir ayardir).
const GENISLIK_ANAHTARI = "kokpit-dava-dosyalari-sutun-genislikleri";
const dinleyiciler = new Set<() => void>();

// KRITIK: useSyncExternalStore, getSnapshot'un referansca AYNI kalan bir
// deger dondurmesini sart kosar - bkz. ayni desenin diger kullanimi olan
// kenar-cubugu.tsx. Ham localStorage degeri degismedigi surece onbellekten
// AYNI referansi donuyoruz, aksi halde sonsuz render dongusune girilir.
let onbellek: { ham: string | null; sonuc: Record<string, number> | null } = {
  ham: undefined as unknown as string,
  sonuc: null,
};

function genislikleriOku(): Record<string, number> | null {
  let ham: string | null;
  try {
    ham = localStorage.getItem(GENISLIK_ANAHTARI);
  } catch {
    ham = null;
  }
  if (ham === onbellek.ham) return onbellek.sonuc;

  let sonuc: Record<string, number> | null = null;
  if (ham) {
    try {
      const ayristirilan = JSON.parse(ham) as Record<string, unknown>;
      const gecerli: Record<string, number> = {};
      for (const [anahtar, deger] of Object.entries(ayristirilan)) {
        if (typeof deger === "number" && Number.isFinite(deger) && deger >= MIN_GENISLIK) {
          gecerli[anahtar] = deger;
        }
      }
      sonuc = gecerli;
    } catch {
      sonuc = null;
    }
  }
  onbellek = { ham, sonuc };
  return sonuc;
}

function genislikleriYaz(genislikler: Record<string, number>) {
  try {
    localStorage.setItem(GENISLIK_ANAHTARI, JSON.stringify(genislikler));
  } catch {
    // localStorage erisilemez (gizli sekme vb.) - sessizce yok say
  }
  dinleyiciler.forEach((dinleyici) => dinleyici());
}

function genislikleriAbone(dinleyici: () => void) {
  dinleyiciler.add(dinleyici);
  return () => dinleyiciler.delete(dinleyici);
}

// Uzun metinlerin satir yuksekligini sismesine izin vermek yerine tek
// satirda kalip "..." ile kesilmesi icin - tam metin `title` ile imlec
// uzerine gelince gorulebilir. Genislik <col>/table-fixed ile disaridan
// belirlendigi icin burada sabit bir maxWidth gerekmiyor.
function Hucre({ children }: { children: ReactNode }) {
  const metin = typeof children === "string" ? children : undefined;
  return (
    <div className="truncate" title={metin}>
      {children}
    </div>
  );
}

function SutunBasligi({
  etiket,
  genislik,
  suruklemeBaslat,
}: {
  etiket: string;
  genislik: number;
  suruklemeBaslat: (e: React.MouseEvent) => void;
}) {
  return (
    <th
      className="relative select-none whitespace-nowrap px-2 py-1.5 text-left text-xs font-medium"
      style={{ width: genislik }}
    >
      <div className="truncate pr-2" title={etiket}>
        {etiket}
      </div>
      {/* Sutun kenarindan surukleyerek genislik ayarlama tutamaci - drag&drop
          (HTML5 draggable) ile karismasin diye ayri bir mousedown temelli
          surukleme kullanir; draggable={false} native surukleme baslatmasini
          bu tutamac uzerinde bastirir. */}
      <div
        role="separator"
        aria-orientation="vertical"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          suruklemeBaslat(e);
        }}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none hover:bg-white/20 active:bg-[var(--accent)]/50"
      />
    </th>
  );
}

export function DosyalarTablosu({
  dosyalar,
  gorunurSutunlar,
  sutunEtiketleri,
  silmeYetkisiVar,
}: {
  dosyalar: Dosya[];
  gorunurSutunlar: string[];
  sutunEtiketleri: Record<string, string>;
  silmeYetkisiVar: boolean;
}) {
  const kayitliGenislikler = useSyncExternalStore(genislikleriAbone, genislikleriOku, () => null);
  // Surukleme SIRASINDA canli onizleme icin gecici state; birak (mouseup)
  // aninda kalici hale (localStorage) yazilir.
  const [taslakGenislikler, setTaslakGenislikler] = useState<Record<string, number> | null>(null);
  const genislikler = { ...VARSAYILAN_GENISLIKLER, ...kayitliGenislikler, ...taslakGenislikler };

  function genislikSuruklemeBaslat(anahtar: string, baslangicE: React.MouseEvent) {
    const baslangicX = baslangicE.clientX;
    const baslangicGenislik = genislikler[anahtar] ?? VARSAYILAN_GENISLIK;
    const temel = { ...VARSAYILAN_GENISLIKLER, ...kayitliGenislikler };

    function hareket(e: MouseEvent) {
      const yeni = Math.max(MIN_GENISLIK, baslangicGenislik + (e.clientX - baslangicX));
      setTaslakGenislikler((onceki) => ({ ...(onceki ?? temel), [anahtar]: yeni }));
    }
    function birak() {
      window.removeEventListener("mousemove", hareket);
      window.removeEventListener("mouseup", birak);
      setTaslakGenislikler((guncel) => {
        if (guncel) genislikleriYaz({ ...temel, ...guncel });
        return null;
      });
    }
    window.addEventListener("mousemove", hareket);
    window.addEventListener("mouseup", birak);
  }

  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full table-fixed text-left text-xs">
        <colgroup>
          {gorunurSutunlar.map((anahtar) => (
            <col key={anahtar} style={{ width: genislikler[anahtar] ?? VARSAYILAN_GENISLIK }} />
          ))}
          <col style={{ width: genislikler.islemler ?? VARSAYILAN_GENISLIKLER.islemler }} />
        </colgroup>
        <thead className="text-white/50">
          <tr>
            {gorunurSutunlar.map((anahtar) => (
              <SutunBasligi
                key={anahtar}
                etiket={sutunEtiketleri[anahtar] ?? anahtar}
                genislik={genislikler[anahtar] ?? VARSAYILAN_GENISLIK}
                suruklemeBaslat={(e) => genislikSuruklemeBaslat(anahtar, e)}
              />
            ))}
            <SutunBasligi
              etiket="İşlemler"
              genislik={genislikler.islemler ?? VARSAYILAN_GENISLIKLER.islemler}
              suruklemeBaslat={(e) => genislikSuruklemeBaslat("islemler", e)}
            />
          </tr>
        </thead>
        <tbody>
          {dosyalar.map((dosya) => (
            <tr key={dosya.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
              {gorunurSutunlar.map((anahtar) => (
                <td
                  key={anahtar}
                  className={`px-2 py-1 ${anahtar === "konu" ? "text-white/85" : "text-white/60"}`}
                >
                  <Hucre>{SUTUN_HUCRELERI[anahtar]?.(dosya)}</Hucre>
                </td>
              ))}
              <td className="px-2 py-1">
                <div className="flex items-center gap-1.5">
                  <Link href={`/kokpit/dava-dosyalari/${dosya.id}`}>
                    <Dugme type="button" varyant="ikincil" boyut="kompakt">
                      Aç
                    </Dugme>
                  </Link>
                  {silmeYetkisiVar && <DavaDosyasiSilmeButonu dosyaId={dosya.id} boyut="kompakt" />}
                </div>
              </td>
            </tr>
          ))}
          {dosyalar.length === 0 && (
            <tr>
              <td colSpan={gorunurSutunlar.length + 1} className="px-4 py-8 text-center text-white/40">
                Kayıt bulunamadı.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
