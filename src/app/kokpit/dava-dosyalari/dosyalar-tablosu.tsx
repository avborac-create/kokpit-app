"use client";

import { useSyncExternalStore, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import type { davaDosyalariniListele } from "@/modules/dava-dosyasi/lib/queries";
import { DAVA_DOSYALARI_SUTUN_ACIKLAMALARI } from "@/core/tablo-duzeni/dava-dosyalari-sutunlari";
import {
  kokpitNoGoster,
  buroNoGoster,
} from "@/modules/dava-dosyasi/lib/kokpit-no";
import { ACMA_STILLERI, AcmaDugmesi, VARSAYILAN_ACMA_STILI, acmaStiliGecerliMi, type AcmaStili } from "./acma-dugmesi";
import { TopluIslemCubugu } from "./toplu-islem-cubugu";

type Dosya = Awaited<ReturnType<typeof davaDosyalariniListele>>[number];

// Sütun anahtarı -> hücre içeriği. Görünür sütun kümesi/sırası admin
// tarafında (Ayarlar > Sütun Düzeni) belirlenir - bu harita sadece NASIL
// render edileceğini tanımlar (bkz. dava-dosyalari/page.tsx).
// Tür sütunu kısa tutulur: Hukuk / Ceza / İdari / İcra / AYM.
// Konu ayrı sütunda; diğer dosya türleri (İhtar vb.) kendi adıyla görünür.
function turMetni(dosya: Dosya): string {
  const kod = dosya.tur?.kod;
  const yargi = dosya.yargiKolu?.etiket;
  return kod === "icra_dosyasi"
    ? "İcra"
    : kod === "dava_dosyasi" && yargi
      ? yargi === "Anayasa Mahkemesi"
        ? "AYM"
        : yargi
      : (dosya.tur?.etiket.replace(/ Dosyası$/, "") ?? "—");
}

// Genişlik ölçümü için sütunun düz metni (otomatik daralma).
const OLCU_METINLERI: Record<string, (dosya: Dosya) => string> = {
  kayitNo: (d) => kokpitNoGoster(d),
  buroNo: (d) => String(buroNoGoster(d.buroNo) ?? ""),
  dosyaNo: (d) => d.dosyaNo ?? "—",
  tur: (d) => turMetni(d),
  birimAdi: (d) => d.birimAdi ?? "—",
  konu: (d) => d.konu ?? "",
  karsiTaraflar: (d) =>
    d.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ") || "—",
  muvekkiller: (d) =>
    d.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—",
  durum: (d) => d.durum.etiket,
  sorumluAvukat: (d) => d.sorumluAvukat?.adSoyad ?? "—",
};

const KARAKTER_GENISLIGI = 7.4;

const SUTUN_HUCRELERI: Record<string, (dosya: Dosya) => ReactNode> = {
  kayitNo: (dosya) => (
    <Link
      href={`/kokpit/dava-dosyalari/${dosya.id}`}
      className="truncate font-medium text-[#6db8ff] underline decoration-[#6db8ff]/40 underline-offset-4 hover:decoration-[#6db8ff]"
    >
      {kokpitNoGoster(dosya)}
    </Link>
  ),
  buroNo: (dosya) => buroNoGoster(dosya.buroNo),
  dosyaNo: (dosya) => dosya.dosyaNo ?? "—",
  tur: (dosya) => {
    const metin = turMetni(dosya);
    return (
      <span className="flex items-center gap-1.5">
        <span className="truncate">{metin}</span>
        {dosya.muvekkilSifati === "BORCLU" &&
          dosya.tur?.kod === "icra_dosyasi" && (
            <span className="shrink-0 rounded-full bg-[var(--danger-soft)] px-1.5 py-0.5 text-[11px] text-[#ff7a70]">
              Borçlu
            </span>
          )}
      </span>
    );
  },
  birimAdi: (dosya) => dosya.birimAdi ?? "—",
  karsiTaraflar: (dosya) =>
    dosya.karsiTaraflar.length > 0
      ? dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ")
      : "—",
  muvekkiller: (dosya) =>
    dosya.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—",
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
        if (
          typeof deger === "number" &&
          Number.isFinite(deger) &&
          deger >= MIN_GENISLIK
        ) {
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

// Kisiye ozel gizlenen sutunlar (ayni onbellekli useSyncExternalStore deseni).
const GIZLI_ANAHTARI = "kokpit-dava-dosyalari-gizli-sutunlar";
const gizliDinleyiciler = new Set<() => void>();
let gizliOnbellek: { ham: string | null; sonuc: string[] } = { ham: undefined as unknown as string, sonuc: [] };
const BOS_LISTE: string[] = [];

function gizlileriOku(): string[] {
  let ham: string | null;
  try {
    ham = localStorage.getItem(GIZLI_ANAHTARI);
  } catch {
    ham = null;
  }
  if (ham === gizliOnbellek.ham) return gizliOnbellek.sonuc;
  let sonuc = BOS_LISTE;
  if (ham) {
    try {
      const l = JSON.parse(ham);
      if (Array.isArray(l)) sonuc = l.filter((x): x is string => typeof x === "string");
    } catch {
      sonuc = BOS_LISTE;
    }
  }
  gizliOnbellek = { ham, sonuc };
  return sonuc;
}

function gizlileriYaz(liste: string[]) {
  try {
    localStorage.setItem(GIZLI_ANAHTARI, JSON.stringify(liste));
  } catch {
    // localStorage erisilemez - sessizce yok say
  }
  gizliDinleyiciler.forEach((d) => d());
}

function gizlileriAbone(d: () => void) {
  gizliDinleyiciler.add(d);
  return () => gizliDinleyiciler.delete(d);
}

// Kisiye ozel acma dugmesi stili (ilkel deger oldugu icin onbellek gerekmez).
const ACMA_ANAHTARI = "kokpit-dava-dosyalari-acma-dugmesi";
const acmaDinleyiciler = new Set<() => void>();

function acmaStiliniOku(): AcmaStili {
  try {
    const v = localStorage.getItem(ACMA_ANAHTARI);
    return acmaStiliGecerliMi(v) ? v : VARSAYILAN_ACMA_STILI;
  } catch {
    return VARSAYILAN_ACMA_STILI;
  }
}

function acmaStiliniYaz(stil: AcmaStili) {
  try {
    localStorage.setItem(ACMA_ANAHTARI, stil);
  } catch {
    // localStorage erisilemez - sessizce yok say
  }
  acmaDinleyiciler.forEach((d) => d());
}

function acmaStiliAbone(d: () => void) {
  acmaDinleyiciler.add(d);
  return () => acmaDinleyiciler.delete(d);
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
  ilk,
  bas,
}: {
  ilk?: boolean;
  bas?: ReactNode;
  etiket: string;
  aciklama?: string;
  genislik: number;
  suruklemeBaslat: (e: React.PointerEvent) => void;
}) {
  return (
    <th
      className={`relative select-none whitespace-nowrap py-2 text-left text-[13px] font-medium ${ilk ? "pl-3 pr-2.5" : "px-2.5"}`}
      style={{ width: genislik }}
    >
      <div className="flex items-center gap-2 pr-2">
        {bas}
        <span className="truncate" title={aciklama ?? etiket}>
          {etiket}
        </span>
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
// listede olmayan bir alt dosya tek basina, kendi "KN-19/1" numarasiyla
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
    const cocuklar = (altlar.get(d.id) ?? []).sort(
      (a, b) => (a.altSiraNo ?? 0) - (b.altSiraNo ?? 0),
    );
    satirlar.push({ dosya: d, seviye: 0, altSayisi: cocuklar.length });
    if (!daraltilmis.has(d.id)) {
      for (const c of cocuklar)
        satirlar.push({ dosya: c, seviye: 1, altSayisi: 0 });
    }
  }
  return satirlar;
}

export function DosyalarTablosu({
  dosyalar,
  gorunurSutunlar: tumSutunlar,
  sutunEtiketleri,
  silmeYetkisiVar,
  durumlar,
  avukatlar,
}: {
  dosyalar: Dosya[];
  gorunurSutunlar: string[];
  sutunEtiketleri: Record<string, string>;
  silmeYetkisiVar: boolean;
  durumlar: { id: string; etiket: string }[];
  avukatlar: { id: string; adSoyad: string }[];
}) {
  const gizliSutunlar = useSyncExternalStore(gizlileriAbone, gizlileriOku, () => BOS_LISTE);
  const gorunurSutunlar = tumSutunlar.filter((a) => !gizliSutunlar.includes(a));
  function sutunGizlemeDegistir(anahtar: string) {
    if (anahtar === "kayitNo") return; // dosyayi acan baglanti bu sutunda
    if (gizliSutunlar.includes(anahtar)) gizlileriYaz(gizliSutunlar.filter((a) => a !== anahtar));
    else if (gorunurSutunlar.length > 1) gizlileriYaz([...gizliSutunlar, anahtar]);
  }
  const kayitliGenislikler = useSyncExternalStore(
    genislikleriAbone,
    genislikleriOku,
    () => null,
  );
  // Surukleme SIRASINDA canli onizleme icin gecici state; birak (mouseup)
  // aninda kalici hale (localStorage) yazilir.
  const [taslakGenislikler, setTaslakGenislikler] = useState<Record<
    string,
    number
  > | null>(null);
  const [daraltilmis, setDaraltilmis] = useState<Set<string>>(new Set());
  const satirlar = agacSatirlari(dosyalar, daraltilmis);
  // Toplu secim: yalnizca listede gorunen satirlar gecerlidir (silinen/filtrelenen kayitlar otomatik duser).
  const [secim, setSecim] = useState<Set<string>>(new Set());
  const [secimModu, setSecimModu] = useState(false);
  const router = useRouter();
  const acmaStili = useSyncExternalStore(acmaStiliAbone, acmaStiliniOku, () => VARSAYILAN_ACMA_STILI);
  const acmaGenisligi = ACMA_STILLERI.find((x) => x.kod === acmaStili)?.genislik ?? 0;
  // 14px dolgu + (secim kutusu 18px + bosluk) + (acma dugmesi + bosluk)
  // Ilk sutunun basina giren oge payi: secim kutusu (18px + bosluk) ve varsa acma dugmesi.
  const ilkEk = 0;
  // Sagda sabit duran giris dugmesi sutunu.
  const sonSutun = 30 + (acmaGenisligi ? acmaGenisligi + 8 : 0) + 20;
  function secimModunuDegistir() {
    setSecim(new Set());
    setSecimModu((m) => !m);
  }
  const gorunenIdler = satirlar.map((s) => s.dosya.id);
  const seciliIdler = gorunenIdler.filter((id) => secim.has(id));
  const hepsiSecili =
    gorunenIdler.length > 0 && seciliIdler.length === gorunenIdler.length;
  function secimiDegistir(id: string) {
    setSecim((o) => {
      const y = new Set(o);
      if (!y.delete(id)) y.add(id);
      return y;
    });
  }
  function hepsiniDegistir() {
    setSecim(hepsiSecili ? new Set() : new Set(gorunenIdler));
  }
  const anaDosyaIdleri = satirlar
    .filter((s) => s.altSayisi > 0)
    .map((s) => s.dosya.id);
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
  // Kullanici elle ayarlamadiysa sutun, icerigi kisaysa (ornegin 3-4 karakter) otomatik daralir;
  // varsayilan genislikten buyumez.
  const otomatik: Record<string, number> = {};
  gorunurSutunlar.forEach((anahtar, i) => {
    const olcu = OLCU_METINLERI[anahtar];
    const ust = (VARSAYILAN_GENISLIKLER[anahtar] ?? VARSAYILAN_GENISLIK) + (i === 0 ? ilkEk : 0);
    if (!olcu) return;
    let enUzun = (sutunEtiketleri[anahtar] ?? anahtar).length;
    for (const { dosya } of satirlar)
      enUzun = Math.max(enUzun, olcu(dosya).length);
    const ek = 28 + (i === 0 ? 44 + ilkEk : 0) + (anahtar === "durum" ? 16 : 0);
    otomatik[anahtar] = Math.min(
      ust,
      Math.max(MIN_GENISLIK, Math.ceil(enUzun * KARAKTER_GENISLIGI + ek)),
    );
  });
  const genislikler = {
    ...VARSAYILAN_GENISLIKLER,
    ...otomatik,
    ...kayitliGenislikler,
    ...taslakGenislikler,
  };
  const toplamGenislik =
    gorunurSutunlar.reduce(
      (t, a) => t + (genislikler[a] ?? VARSAYILAN_GENISLIK),
      0,
    ) +
    sonSutun;

  function genislikSuruklemeBaslat(
    anahtar: string,
    baslangicE: React.PointerEvent,
  ) {
    const baslangicX = baslangicE.clientX;
    const baslangicGenislik = genislikler[anahtar] ?? VARSAYILAN_GENISLIK;
    const temel = {
      ...VARSAYILAN_GENISLIKLER,
      ...otomatik,
      ...kayitliGenislikler,
    };

    function hareket(e: PointerEvent) {
      const yeni = Math.max(
        MIN_GENISLIK,
        baslangicGenislik + (e.clientX - baslangicX),
      );
      setTaslakGenislikler((onceki) => ({
        ...(onceki ?? temel),
        [anahtar]: yeni,
      }));
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
      <div className="mb-2 flex justify-end gap-2 text-xs">
        {secimModu && (
          <button
            type="button"
            onClick={secimModunuDegistir}
            className="rounded-full bg-[var(--accent)] px-3 py-1 text-white"
          >
            Seçimi kapat
          </button>
        )}
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-full px-3 py-1 text-white/60 hover:bg-white/10 hover:text-white [&::-webkit-details-marker]:hidden">
            Açma düğmesi
          </summary>
          <div className="absolute right-0 z-30 mt-1 w-64 rounded-xl border border-white/20 bg-[var(--yuzey,#1c2432)] p-2 shadow-2xl">
            {ACMA_STILLERI.map((x) => (
              <label key={x.kod} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-white hover:bg-white/10">
                <input type="radio" name="acma-stili" className="sr-only" checked={acmaStili === x.kod} onChange={() => acmaStiliniYaz(x.kod)} />
                <span className={`h-3 w-3 shrink-0 rounded-full border ${acmaStili === x.kod ? "border-[var(--accent)] bg-[var(--accent)]" : "border-white/40"}`} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span>{x.ad}</span>
                  <span className="truncate text-xs text-white/50">{x.not}</span>
                </span>
                <span className="flex w-[50px] justify-center">
                  <AcmaDugmesi stil={x.kod} />
                </span>
              </label>
            ))}
          </div>
        </details>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-full px-3 py-1 text-white/60 hover:bg-white/10 hover:text-white [&::-webkit-details-marker]:hidden">
            Sütunlar{gizliSutunlar.length > 0 ? ` (${gizliSutunlar.length} gizli)` : ""}
          </summary>
          <div className="absolute right-0 z-30 mt-1 w-56 rounded-xl border border-white/20 bg-[var(--yuzey,#1c2432)] p-2 shadow-2xl">
            {tumSutunlar.map((anahtar) => (
              <label key={anahtar} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-white hover:bg-white/10">
                <input
                  type="checkbox"
                  className="onay-kutusu"
                  checked={!gizliSutunlar.includes(anahtar)}
                  disabled={anahtar === "kayitNo"}
                  onChange={() => sutunGizlemeDegistir(anahtar)}
                />
                {sutunEtiketleri[anahtar] ?? anahtar}
              </label>
            ))}
            {gizliSutunlar.length > 0 && (
              <button type="button" onClick={() => gizlileriYaz([])} className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-[var(--link)] hover:bg-white/10">
                Tümünü göster
              </button>
            )}
          </div>
        </details>
        {anaDosyaIdleri.length > 0 && (
          <>
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
          </>
        )}
      </div>
      <div className={`glass overflow-x-auto rounded-2xl`}>
        <table
          className="table-fixed text-left text-sm"
          style={{ width: toplamGenislik }}
        >
          <colgroup>
            {gorunurSutunlar.map((anahtar) => (
              <col
                key={anahtar}
                style={{ width: genislikler[anahtar] ?? VARSAYILAN_GENISLIK }}
              />
            ))}
            <col style={{ width: sonSutun }} />
          </colgroup>
          <thead className="text-white/50">
            <tr>
              {gorunurSutunlar.map((anahtar) => (
                <SutunBasligi
                  key={anahtar}
                  ilk={anahtar === gorunurSutunlar[0]}
                  etiket={sutunEtiketleri[anahtar] ?? anahtar}
                  aciklama={DAVA_DOSYALARI_SUTUN_ACIKLAMALARI[anahtar]}
                  genislik={genislikler[anahtar] ?? VARSAYILAN_GENISLIK}
                  suruklemeBaslat={(e) => genislikSuruklemeBaslat(anahtar, e)}
                />
              ))}
              <th className="sticky right-0 z-10 bg-[var(--yuzey,#1c2432)] p-0">
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="checkbox"
                    checked={secimModu && hepsiSecili}
                    ref={(el) => {
                      if (el) el.indeterminate = secimModu && seciliIdler.length > 0 && !hepsiSecili;
                    }}
                    onChange={() => (secimModu ? hepsiniDegistir() : setSecimModu(true))}
                    aria-label={secimModu ? "Tümünü seç" : "Seçim modunu aç"}
                    title={secimModu ? "Tümünü seç" : "Dosya seçmek için tıklayın"}
                    className="onay-kutusu"
                  />
                  {/* Satirlardaki giris dugmesiyle ayni genislikte bos pay: kutular alt alta hizalanir. */}
                  <span className="shrink-0" style={{ width: acmaGenisligi }} aria-hidden="true" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map(({ dosya, seviye, altSayisi }) => (
              <tr
                key={dosya.id}
                onDoubleClick={(e) => {
                // Baglanti, dugme, kutu gibi etkilesimli ogelere cift tiklama dosyayi acmaz.
                if ((e.target as HTMLElement).closest("a,button,input,label,select,details")) return;
                router.push(`/kokpit/dava-dosyalari/${dosya.id}`);
              }}
              className={`group/satir select-none border-t border-white/[0.06] hover:bg-white/[0.04] ${secim.has(dosya.id) ? "bg-[var(--accent-soft)]" : ""}`}
              >
                {gorunurSutunlar.map((anahtar, sutunIndex) => (
                  <td
                    key={anahtar}
                    className={`${sutunIndex === 0 ? "pl-3 pr-2.5" : "px-2.5"} py-1.5 ${anahtar === "konu" ? "text-white/85" : "text-white/60"}`}
                  >
                    {sutunIndex === 0 ? (
                      <div className="flex items-center gap-1">
                        <span className="shrink-0" style={{ width: seviye * 18 }} />
                        {seviye === 1 ? (
                          <span className="w-3.5 shrink-0 text-white/35">└</span>
                        ) : altSayisi > 0 ? (
                          <button
                            type="button"
                            onClick={() => agaciDegistir(dosya.id)}
                            aria-label={
                              daraltilmis.has(dosya.id)
                                ? "Alt dosyaları göster"
                                : "Alt dosyaları gizle"
                            }
                            className="flex h-4 w-3.5 shrink-0 items-center justify-center rounded text-white/60 hover:bg-white/10"
                          >
                            <span
                              className={`text-[10px] transition-transform ${daraltilmis.has(dosya.id) ? "-rotate-90" : ""}`}
                            >
                              ▼
                            </span>
                          </button>
                        ) : (
                          <span className="w-3.5 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <Hucre>{SUTUN_HUCRELERI[anahtar]?.(dosya)}</Hucre>
                        </div>
                        {altSayisi > 0 && (
                          <span className="shrink-0 text-[11px] text-white/40">
                            {altSayisi} alt
                          </span>
                        )}
                      </div>
                    ) : (
                      <Hucre>{SUTUN_HUCRELERI[anahtar]?.(dosya)}</Hucre>
                    )}
                  </td>
                ))}
                <td className={`sticky right-0 z-10 border-t border-white/[0.06] p-0 ${secim.has(dosya.id) ? "bg-[color-mix(in_srgb,var(--yuzey,#1c2432),var(--accent)_22%)]" : "bg-[var(--yuzey,#1c2432)]"}`}>
                  <div className="flex h-12 items-center justify-center gap-2">
                    {secimModu && (
                      <input
                        type="checkbox"
                        checked={secim.has(dosya.id)}
                        onChange={() => secimiDegistir(dosya.id)}
                        aria-label="Dosyayı seç"
                        className="onay-kutusu"
                      />
                    )}
                    {!secimModu && <span className="w-[18px] shrink-0" aria-hidden="true" />}
                    <AcmaDugmesi stil={acmaStili} href={`/kokpit/dava-dosyalari/${dosya.id}`} />
                  </div>
                </td>
              </tr>
            ))}
            {dosyalar.length === 0 && (
              <tr>
                <td
                  colSpan={gorunurSutunlar.length + 1}
                  className="px-4 py-8 text-center text-white/40"
                >
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {seciliIdler.length > 0 && (
        <TopluIslemCubugu
          secililer={seciliIdler.map((id) => ({
            id,
            etiket: kokpitNoGoster(
              satirlar.find((s) => s.dosya.id === id)!.dosya,
            ),
          }))}
          durumlar={durumlar}
          avukatlar={avukatlar}
          silmeYetkisiVar={silmeYetkisiVar}
          temizle={() => setSecim(new Set())}
        />
      )}
    </>
  );
}
