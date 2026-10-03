"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { davaDosyalariniListele } from "@/modules/dava-dosyasi/lib/queries";
import { DAVA_DOSYALARI_SUTUN_ACIKLAMALARI } from "@/core/tablo-duzeni/dava-dosyalari-sutunlari";
import { kokpitNoGoster, buroNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";
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
      {kokpitNoGoster(dosya)}
    </Link>
  ),
  buroNo: (dosya) => buroNoGoster(dosya.buroNo),
  dosyaNo: (dosya) => dosya.dosyaNo ?? "—",
  tur: (dosya) => {
    const tur = dosya.tur?.etiket.replace(/ Dosyası$/, "");
    const turMetni = [tur, dosya.yargiKolu?.etiket].filter(Boolean).join(" › ");
    const metin = [turMetni, dosya.hukukiIliskiTuru?.etiket].filter(Boolean).join(" · ") || "—";
    return (
      <span className="flex items-center gap-1.5">
        <span className="truncate">{metin}</span>
        {dosya.muvekkilSifati === "BORCLU" && (
          <span className="shrink-0 rounded-full bg-[var(--danger-soft)] px-1.5 py-0.5 text-[11px] text-[#ff7a70]">
            Borçlu
          </span>
        )}
      </span>
    );
  },
  birimAdi: (dosya) => dosya.birimAdi ?? "—",
  karsiTaraflar: (dosya) =>
    dosya.karsiTaraflar.length > 0 ? dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ") : "—",
  muvekkiller: (dosya) => dosya.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—",
  durum: (dosya) => (
    <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[#6db8ff]">
      {dosya.durum.etiket}
    </span>
  ),
  sorumluAvukat: (dosya) => dosya.sorumluAvukat?.adSoyad ?? "—",
};

const VARSAYILAN_GENISLIK = 130;
const VARSAYILAN_GENISLIKLER: Record<string, number> = {
  kayitNo: 150,
  buroNo: 80,
  dosyaNo: 92,
  tur: 210,
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
  aciklama,
  genislik,
  suruklemeBaslat,
}: {
  etiket: string;
  aciklama?: string;
  genislik: number;
  suruklemeBaslat: (e: React.PointerEvent) => void;
}) {
  return (
    <th
      className="relative select-none whitespace-nowrap px-2.5 py-2 text-left text-[13px] font-medium"
      style={{ width: genislik }}
    >
      <div className="truncate pr-2" title={aciklama ?? etiket}>
        {etiket}
      </div>
      {/* Sutun kenarindan surukleyerek genislik ayarlama tutamaci - drag&drop
          (HTML5 draggable) ile karismasin diye ayri bir pointer temelli
          surukleme kullanir (fare + dokunmatik); draggable={false} native
          surukleme baslatmasini bu tutamac uzerinde bastirir. touch-none
          tarayicinin yatay kaydirma/zoom jestini tutamac uzerinde engeller.
          Mobilde parmakla tutulabilsin diye daha genis (w-5), ince imlecli
          cihazlarda (md+) ince (w-2). Gorunur ince cizgi sutun sinirini gosterir. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`${etiket} sütun genişliği`}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          suruklemeBaslat(e);
        }}
        className="group absolute right-0 top-0 flex h-full w-5 cursor-col-resize touch-none justify-end md:w-2"
      >
        <span className="h-full w-0.5 bg-white/25 group-hover:bg-white/40 group-active:bg-[var(--accent)] md:bg-transparent" />
      </div>
    </th>
  );
}

type Satir = { dosya: Dosya; seviye: 0 | 1; altSayisi: number };

// Duz listeyi agaca cevirir: alt dosyalar ana dosyasinin hemen altina, altSiraNo
// sirasiyla girintili dizilir. Ana dosyasi (arama/durum filtresi yuzunden)
// listede olmayan bir alt dosya tek basina, kendi "KP-0019/1" numarasiyla
// gorunur. Daraltilmis ana dosyalarin alt satirlari atlanir.
function agacSatirlari(dosyalar: Dosya[], daraltilmis: Set<string>): Satir[] {
  const idler = new Set(dosyalar.map((d) => d.id));
  const altlar = new Map<string, Dosya[]>();
  for (const d of dosyalar) {
    if (d.anaDosya && idler.has(d.anaDosya.id)) {
      const liste = altlar.get(d.anaDosya.id) ?? [];
      liste.push(d);
      altlar.set(d.anaDosya.id, liste);
    }
  }
  const satirlar: Satir[] = [];
  for (const d of dosyalar) {
    if (d.anaDosya && idler.has(d.anaDosya.id)) continue;
    const cocuklar = (altlar.get(d.id) ?? []).sort((a, b) => (a.altSiraNo ?? 0) - (b.altSiraNo ?? 0));
    satirlar.push({ dosya: d, seviye: 0, altSayisi: cocuklar.length });
    if (!daraltilmis.has(d.id)) {
      for (const c of cocuklar) satirlar.push({ dosya: c, seviye: 1, altSayisi: 0 });
    }
  }
  return satirlar;
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
  const [daraltilmis, setDaraltilmis] = useState<Set<string>>(new Set());
  const satirlar = agacSatirlari(dosyalar, daraltilmis);
  const anaDosyaIdleri = satirlar.filter((s) => s.altSayisi > 0).map((s) => s.dosya.id);
  // Daraltilmis ana dosyalarin da listesi (satirlar daraltilinca alt satirlari
  // icermez ama ana satirin kendisi hep vardir).
  function tumunuGenislet() {
    setDaraltilmis(new Set());
  }
  function tumunuDaralt() {
    setDaraltilmis(new Set(anaDosyaIdleri));
  }
  function agaciDegistir(id: string) {
    setDaraltilmis((onceki) => {
      const yeni = new Set(onceki);
      if (!yeni.delete(id)) yeni.add(id);
      return yeni;
    });
  }
  const genislikler = { ...VARSAYILAN_GENISLIKLER, ...kayitliGenislikler, ...taslakGenislikler };

  function genislikSuruklemeBaslat(anahtar: string, baslangicE: React.PointerEvent) {
    const baslangicX = baslangicE.clientX;
    const baslangicGenislik = genislikler[anahtar] ?? VARSAYILAN_GENISLIK;
    const temel = { ...VARSAYILAN_GENISLIKLER, ...kayitliGenislikler };

    function hareket(e: PointerEvent) {
      const yeni = Math.max(MIN_GENISLIK, baslangicGenislik + (e.clientX - baslangicX));
      setTaslakGenislikler((onceki) => ({ ...(onceki ?? temel), [anahtar]: yeni }));
    }
    function birak() {
      window.removeEventListener("pointermove", hareket);
      window.removeEventListener("pointerup", birak);
      window.removeEventListener("pointercancel", birak);
      setTaslakGenislikler((guncel) => {
        if (guncel) genislikleriYaz({ ...temel, ...guncel });
        return null;
      });
    }
    window.addEventListener("pointermove", hareket);
    window.addEventListener("pointerup", birak);
    window.addEventListener("pointercancel", birak);
  }

  return (
    <>
      {anaDosyaIdleri.length > 0 && (
        <div className="mb-2 flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={tumunuGenislet}
            disabled={daraltilmis.size === 0}
            className="rounded-full px-3 py-1 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Tümünü genişlet
          </button>
          <button
            type="button"
            onClick={tumunuDaralt}
            disabled={daraltilmis.size >= anaDosyaIdleri.length}
            className="rounded-full px-3 py-1 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Tümünü daralt
          </button>
        </div>
      )}
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full table-fixed text-left text-sm">
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
                aciklama={DAVA_DOSYALARI_SUTUN_ACIKLAMALARI[anahtar]}
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
          {satirlar.map(({ dosya, seviye, altSayisi }) => (
            <tr
              key={dosya.id}
              className={`border-t border-white/[0.06] hover:bg-white/[0.04] ${seviye === 0 && altSayisi > 0 ? "bg-white/[0.03]" : ""}`}
            >
              {gorunurSutunlar.map((anahtar, sutunIndex) => (
                <td
                  key={anahtar}
                  className={`px-2.5 py-1.5 ${anahtar === "konu" ? "text-white/85" : "text-white/60"}`}
                >
                  {sutunIndex === 0 ? (
                    <div className="flex items-center gap-1" style={{ paddingLeft: seviye * 18 }}>
                      {seviye === 1 ? (
                        <span className="w-4 shrink-0 text-white/35">└</span>
                      ) : altSayisi > 0 ? (
                        <button
                          type="button"
                          onClick={() => agaciDegistir(dosya.id)}
                          aria-label={daraltilmis.has(dosya.id) ? "Alt dosyaları göster" : "Alt dosyaları gizle"}
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-white/60 hover:bg-white/10"
                        >
                          <span className={`text-[10px] transition-transform ${daraltilmis.has(dosya.id) ? "-rotate-90" : ""}`}>
                            ▼
                          </span>
                        </button>
                      ) : (
                        <span className="w-4 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <Hucre>{SUTUN_HUCRELERI[anahtar]?.(dosya)}</Hucre>
                      </div>
                      {altSayisi > 0 && <span className="shrink-0 text-[11px] text-white/40">{altSayisi} alt</span>}
                    </div>
                  ) : (
                    <Hucre>{SUTUN_HUCRELERI[anahtar]?.(dosya)}</Hucre>
                  )}
                </td>
              ))}
              <td className="px-2.5 py-1.5">
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
    </>
  );
}
