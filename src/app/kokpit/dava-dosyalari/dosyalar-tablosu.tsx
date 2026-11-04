"use client";

import { useSyncExternalStore, useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import type { davaDosyalariniListele } from "@/modules/dava-dosyasi/lib/queries";
import { DAVA_DOSYALARI_SUTUN_ACIKLAMALARI } from "@/core/tablo-duzeni/dava-dosyalari-sutunlari";
import {
  kokpitNoGoster,
  buroNoGoster,
} from "@/modules/dava-dosyasi/lib/kokpit-no";
import { etiketleriKaydet } from "@/core/arayuz-etiketi/actions";
import { sutunSirasiniVarsayilanYap } from "@/core/tablo-duzeni/actions";
import { TopluIslemCubugu } from "./toplu-islem-cubugu";
import { dosyaDurumSinifi } from "@/modules/dava-dosyasi/lib/durum-rengi";
import { BOS_FILTRE, SutunFiltresi, filtreleriAbone, filtreleriOku, filtreleriYaz } from "./sutun-filtresi";

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

// Sutun filtresi: sutundaki (birden cok olabilen) degerler. Bos olan "—" sayilir.
const FILTRE_DEGERLERI: Record<string, (dosya: Dosya) => string[]> = {
  tur: (d) => [turMetni(d)],
  birimAdi: (d) => [d.birimAdi ?? "—"],
  karsiTaraflar: (d) => (d.karsiTaraflar.length > 0 ? d.karsiTaraflar.map((kt) => kt.karsiTaraf.ad) : ["—"]),
  muvekkiller: (d) => (d.muvekkiller.length > 0 ? d.muvekkiller.map((m) => m.musteri.adSoyadUnvan) : ["—"]),
  durum: (d) => [d.durum.etiket],
  sorumluAvukat: (d) => [d.sorumluAvukat?.adSoyad ?? "—"],
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
    const borcluIcra = dosya.muvekkilSifati === "BORCLU" && dosya.tur?.kod === "icra_dosyasi";
    const metin = borcluIcra ? "Borçlu İcra" : turMetni(dosya);
    return <span className="truncate">{metin}</span>;
  },
  birimAdi: (dosya) => dosya.birimAdi ?? "—",
  karsiTaraflar: (dosya) =>
    dosya.karsiTaraflar.length > 0
      ? dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ")
      : "—",
  muvekkiller: (dosya) =>
    dosya.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—",
  durum: (dosya) => (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${dosyaDurumSinifi(dosya.durum.kod)}`}>
      {dosya.durum.etiket}
    </span>
  ),
  sorumluAvukat: (dosya) => dosya.sorumluAvukat?.adSoyad ?? "—",
};

const VARSAYILAN_GENISLIK = 130;
const VARSAYILAN_GENISLIKLER: Record<string, number> = {
  kayitNo: 150,
  buroNo: 60,
  tur: 90,
  birimAdi: 232,
  dosyaNo: 100,
  konu: 220,
  muvekkiller: 175,
  karsiTaraflar: 219,
  sorumluAvukat: 120,
  durum: 96,
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

// Kisiye ozel sutun sirasi (basliklari surukleyerek ya da Sutunlar menusundeki oklarla); tarayicida saklanir.
const SIRA_ANAHTARI = "kokpit-dava-dosyalari-sutun-sirasi";
const siraDinleyicileri = new Set<() => void>();
let siraOnbellek: { ham: string | null; sonuc: string[] } = { ham: undefined as unknown as string, sonuc: [] };

function siraOku(): string[] {
  let ham: string | null;
  try {
    ham = localStorage.getItem(SIRA_ANAHTARI);
  } catch {
    ham = null;
  }
  if (ham === siraOnbellek.ham) return siraOnbellek.sonuc;
  let sonuc = BOS_LISTE;
  if (ham) {
    try {
      const l = JSON.parse(ham);
      if (Array.isArray(l)) sonuc = l.filter((x): x is string => typeof x === "string");
    } catch {
      sonuc = BOS_LISTE;
    }
  }
  siraOnbellek = { ham, sonuc };
  return sonuc;
}

function siraYaz(liste: string[]) {
  try {
    if (liste.length === 0) localStorage.removeItem(SIRA_ANAHTARI);
    else localStorage.setItem(SIRA_ANAHTARI, JSON.stringify(liste));
  } catch {
    // localStorage erisilemez - sessizce yok say
  }
  siraDinleyicileri.forEach((d) => d());
}

function siraAbone(d: () => void) {
  siraDinleyicileri.add(d);
  return () => siraDinleyicileri.delete(d);
}

function gizlileriAbone(d: () => void) {
  gizliDinleyiciler.add(d);
  return () => gizliDinleyiciler.delete(d);
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
  filtre,
  siralanabilir,
  suruklenen,
  hedefMi,
  hedefSag,
  suruklemeBasladi,
  suruklemeUzerinde,
  suruklemeBirakildi,
  suruklemeBitti,
  etiketKaydet,
}: {
  filtre?: ReactNode;
  ilk?: boolean;
  bas?: ReactNode;
  etiket: string;
  aciklama?: string;
  genislik: number;
  suruklemeBaslat: (e: React.PointerEvent) => void;
  siralanabilir: boolean;
  suruklenen: boolean;
  hedefMi: boolean;
  hedefSag: boolean;
  suruklemeBasladi: () => void;
  // sag: imlec basligin sag yarisinda mi (sutun ondan SONRA birakilir), degilse ondan ONCE.
  suruklemeUzerinde: (sag: boolean) => void;
  suruklemeBirakildi: (sag: boolean) => void;
  suruklemeBitti: () => void;
  // Verilirse (yonetici) baslik yerinde yeniden adlandirilabilir.
  etiketKaydet?: (yeni: string) => Promise<void>;
}) {
  const [duzenliyor, setDuzenliyor] = useState(false);
  const [deger, setDeger] = useState(etiket);
  const [, basla] = useTransition();
  // Genislik tutamacindan baslayan hareket, baslik surukleme (sira) olarak yorumlanmasin.
  const genislikTutuyor = useRef(false);

  function duzenlemeyiBaslat() {
    setDeger(etiket);
    setDuzenliyor(true);
  }
  function kaydet() {
    const yeni = deger.trim();
    setDuzenliyor(false);
    if (!etiketKaydet || yeni === etiket) return;
    basla(async () => {
      try {
        await etiketKaydet(yeni);
      } catch {
        // yetki/ag hatasi: baslik eski haliyle kalir
      }
    });
  }

  return (
    <th
      className={`group/baslik relative select-none whitespace-nowrap py-2 text-left text-[13px] font-medium ${ilk ? "pl-3 pr-2.5" : "px-2.5"} ${siralanabilir && !duzenliyor ? "cursor-grab" : ""} ${suruklenen ? "opacity-40" : ""} ${hedefMi ? (hedefSag ? "shadow-[inset_-3px_0_0_var(--accent)]" : "shadow-[inset_3px_0_0_var(--accent)]") : ""}`}
      style={{ width: genislik }}
      draggable={siralanabilir && !duzenliyor}
      onDragStart={(e) => {
        if (genislikTutuyor.current) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/plain", etiket);
        e.dataTransfer.effectAllowed = "move";
        suruklemeBasladi();
      }}
      onDragOver={(e) => {
        if (!siralanabilir) return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        suruklemeUzerinde(e.clientX > r.left + r.width / 2);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        suruklemeBirakildi(e.clientX > r.left + r.width / 2);
      }}
      onDragEnd={suruklemeBitti}
    >
      <div className="flex items-center gap-2 pr-2">
        {bas}
        {duzenliyor ? (
          <input
            autoFocus
            value={deger}
            maxLength={40}
            onChange={(e) => setDeger(e.target.value)}
            onBlur={kaydet}
            onKeyDown={(e) => {
              if (e.key === "Enter") kaydet();
              if (e.key === "Escape") setDuzenliyor(false);
            }}
            aria-label="Sütun adı"
            title="Enter: kaydet · Esc: vazgeç · boş bırakırsanız varsayılan ad döner"
            className="alan-bmw min-w-0 flex-1 select-text !px-1.5 !py-0.5 text-[13px]"
          />
        ) : (
          <>
            <span className="truncate" title={aciklama ?? etiket}>
              {etiket}
            </span>
            {etiketKaydet && (
              <button
                type="button"
                onClick={duzenlemeyiBaslat}
                aria-label={`${etiket} sütun adını değiştir`}
                title="Sütun adını değiştir"
                className="hidden shrink-0 text-white/40 hover:text-white group-hover/baslik:inline [@media(pointer:coarse)]:inline"
              >
                ✎
              </button>
            )}
          </>
        )}
        {!duzenliyor && filtre}
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
          genislikTutuyor.current = true;
          window.addEventListener("pointerup", () => (genislikTutuyor.current = false), { once: true });
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
  dosyalar: tumDosyalar,
  gorunurSutunlar: tumSutunlar,
  sutunEtiketleri,
  varsayilanEtiketler,
  etiketDuzenlenebilir,
  silmeYetkisiVar,
  durumlar,
  avukatlar,
}: {
  dosyalar: Dosya[];
  gorunurSutunlar: string[];
  sutunEtiketleri: Record<string, string>;
  varsayilanEtiketler: Record<string, string>;
  etiketDuzenlenebilir: boolean;
  silmeYetkisiVar: boolean;
  durumlar: { id: string; etiket: string }[];
  avukatlar: { id: string; adSoyad: string }[];
}) {
  const sutunFiltreleri = useSyncExternalStore(filtreleriAbone, filtreleriOku, () => BOS_FILTRE);
  const etkinFiltreSayisi = Object.keys(sutunFiltreleri).length;
  const dosyalar = tumDosyalar.filter((d) =>
    Object.entries(sutunFiltreleri).every(([sutun, gizli]) => {
      const al = FILTRE_DEGERLERI[sutun];
      return !al || al(d).some((v) => !gizli.includes(v));
    }),
  );
  function filtreDegerleri(sutun: string): string[] {
    const al = FILTRE_DEGERLERI[sutun];
    const kume = new Set<string>();
    for (const d of tumDosyalar) for (const v of al(d)) kume.add(v);
    return [...kume].sort((a, b) => a.localeCompare(b, "tr-TR"));
  }
  const durumKodlari = new Map(tumDosyalar.map((d) => [d.durum.etiket, d.durum.kod]));
  function filtreDegistir(sutun: string, gizli: string[]) {
    const yeni = { ...sutunFiltreleri };
    if (gizli.length === 0) delete yeni[sutun];
    else yeni[sutun] = gizli;
    filtreleriYaz(yeni);
  }
  const gizliSutunlar = useSyncExternalStore(gizlileriAbone, gizlileriOku, () => BOS_LISTE);
  // Kisiye ozel sira (varsa) yonetici sirasinin ustune biner; listede olmayan sutunlar sona eklenir.
  const kisiSirasi = useSyncExternalStore(siraAbone, siraOku, () => BOS_LISTE);
  const siraliSutunlar = [...kisiSirasi.filter((a) => tumSutunlar.includes(a)), ...tumSutunlar.filter((a) => !kisiSirasi.includes(a))];
  const gorunurSutunlar = siraliSutunlar.filter((a) => !gizliSutunlar.includes(a));
  const [suruklenenSutun, setSuruklenenSutun] = useState<string | null>(null);
  const [hedefSutun, setHedefSutun] = useState<string | null>(null);
  const [hedefSag, setHedefSag] = useState(false);
  // sonra=true: kaynak, hedefin sagina; false: soluna konur. hedef null ise en sona.
  function sutunTasi(kaynak: string, hedef: string | null, sonra: boolean) {
    if (kaynak === hedef) return;
    const liste = siraliSutunlar.filter((a) => a !== kaynak);
    if (hedef === null) liste.push(kaynak);
    else {
      const hi = liste.indexOf(hedef);
      if (hi < 0) return;
      liste.splice(hi + (sonra ? 1 : 0), 0, kaynak);
    }
    siraYaz(liste);
  }
  function sutunKaydir(anahtar: string, yon: -1 | 1) {
    const hedef = siraliSutunlar[siraliSutunlar.indexOf(anahtar) + yon];
    if (hedef) sutunTasi(anahtar, hedef, yon === 1);
  }
  const [varsayilanMesaji, setVarsayilanMesaji] = useState("");
  async function siraVarsayilanYap() {
    if (!window.confirm("Şu anki sütun sırası bütün kullanıcılar için varsayılan olsun mu? (Kişisel sırasını kendisi değiştirmiş olanlar kendi sırasında kalır.)")) return;
    try {
      await sutunSirasiniVarsayilanYap("dava-dosyalari", siraliSutunlar);
      siraYaz([]); // artik kisisel sira gereksiz: varsayilan zaten bu
      setVarsayilanMesaji("Bu sıralama herkes için varsayılan yapıldı.");
    } catch {
      setVarsayilanMesaji("Kaydedilemedi; yönetici yetkisi gerekir.");
    }
  }
  async function sutunAdiniKaydet(anahtar: string, yeni: string) {
    await etiketleriKaydet({
      [`tablo.dava-dosyalari.sutun.${anahtar}`]: yeni === varsayilanEtiketler[anahtar] ? "" : yeni,
    });
  }
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
  const ilkEk = 0;
  // Secim modunda tablonun basina giren onay kutusu sutunu (sabit, solda).
  const secimSutunu = secimModu ? 44 : 0;
  // Dosyayi acma: parmakla tek dokunus, fare ile cift tiklama. Metin secilmisse (uzun basma /
  // surukleme) satir acilmaz; onay kutusu, baglanti, dugme gibi ogelere basmak da acmaz.
  function satirdanAc(e: React.MouseEvent, id: string, dokunmatik: boolean) {
    if ((e.target as HTMLElement).closest("a,button,input,label,select,details")) return;
    if (window.getSelection()?.toString()) return;
    if (secimModu) {
      if (!dokunmatik) return;
      secimiDegistir(id);
      return;
    }
    if (dokunmatik) return;
    router.push(`/kokpit/dava-dosyalari/${id}`);
  }
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
  // Masaustu: klavye ile gezinme. Aktif satir vurgulanir; ok tuslari tasir, Enter acar,
  // bosluk (secim modunda) isaretler.
  const [aktifId, setAktifId] = useState<string | null>(null);
  const siraliIdler = satirlar.map((s) => s.dosya.id).join(",");
  useEffect(() => {
    function tus(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && t.closest("input,textarea,select,[contenteditable=true],button,a,summary")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const idler = siraliIdler ? siraliIdler.split(",") : [];
      if (idler.length === 0) return;
      const i = aktifId ? idler.indexOf(aktifId) : -1;
      let yeni: string | null = null;
      if (e.key === "ArrowDown") yeni = idler[Math.min(i + 1, idler.length - 1)];
      else if (e.key === "ArrowUp") yeni = idler[i <= 0 ? 0 : i - 1];
      else if (e.key === "Home") yeni = idler[0];
      else if (e.key === "End") yeni = idler[idler.length - 1];
      else if (e.key === "Enter" && i >= 0) {
        e.preventDefault();
        router.push(`/kokpit/dava-dosyalari/${idler[i]}`);
        return;
      } else if (e.key === " " && i >= 0 && secimModu) {
        e.preventDefault();
        secimiDegistir(idler[i]);
        return;
      } else if (e.key === "Escape" && aktifId) {
        setAktifId(null);
        return;
      }
      if (!yeni) return;
      e.preventDefault();
      setAktifId(yeni);
      document.querySelector(`tr[data-satir-id="${yeni}"]`)?.scrollIntoView({ block: "nearest" });
    }
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  });
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
    secimSutunu;

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
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2 text-xs">
        {etkinFiltreSayisi > 0 && (
          <>
            <span className="text-white/50">
              Sütun filtresi: {dosyalar.length} / {tumDosyalar.length} dosya gösteriliyor
            </span>
            <button type="button" onClick={() => filtreleriYaz({})} className="rounded-full px-3 py-1 text-[var(--link)] hover:bg-white/10">
              Filtreleri temizle ✕
            </button>
          </>
        )}
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-full px-3 py-1 text-white/60 hover:bg-white/10 hover:text-white [&::-webkit-details-marker]:hidden">
            Sütunlar{gizliSutunlar.length > 0 ? ` (${gizliSutunlar.length} gizli)` : ""}
          </summary>
          <div className="absolute right-0 z-30 mt-1 w-56 rounded-xl max-md:fixed max-md:inset-x-3 max-md:w-auto max-md:max-h-[60vh] max-md:overflow-y-auto border border-white/20 bg-[var(--yuzey,#1c2432)] p-2 shadow-2xl">
            <p className="px-2 pb-1 text-[11px] text-white/40">Sırayı değiştirmek için okları kullanın ya da tablo başlığını sürükleyip bırakın.</p>
            {siraliSutunlar.map((anahtar, i) => (
              <div key={anahtar} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-white hover:bg-white/10">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    className="onay-kutusu"
                    checked={!gizliSutunlar.includes(anahtar)}
                    disabled={anahtar === "kayitNo"}
                    onChange={() => sutunGizlemeDegistir(anahtar)}
                  />
                  <span className="truncate">{sutunEtiketleri[anahtar] ?? anahtar}</span>
                </label>
                {(
                  <>
                    <button
                      type="button"
                      aria-label="Sola taşı"
                      disabled={i === 0}
                      onClick={() => sutunKaydir(anahtar, -1)}
                      className="rounded px-1.5 py-1 text-xs text-white/50 hover:text-white disabled:opacity-25"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Sağa taşı"
                      disabled={i === siraliSutunlar.length - 1}
                      onClick={() => sutunKaydir(anahtar, 1)}
                      className="rounded px-1.5 py-1 text-xs text-white/50 hover:text-white disabled:opacity-25"
                    >
                      ↓
                    </button>
                  </>
                )}
              </div>
            ))}
            {etiketDuzenlenebilir && kisiSirasi.length > 0 && (
              <button type="button" onClick={siraVarsayilanYap} className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-[var(--link)] hover:bg-white/10">
                Bu sıralamayı herkes için varsayılan yap
              </button>
            )}
            {varsayilanMesaji && <p className="px-2 py-1 text-xs text-white/60">{varsayilanMesaji}</p>}
            {kisiSirasi.length > 0 && (
              <button type="button" onClick={() => siraYaz([])} className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-[var(--link)] hover:bg-white/10">
                Sıralamayı varsayılana döndür
              </button>
            )}
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
        <button
          type="button"
          onClick={secimModunuDegistir}
          className={`rounded-full px-3 py-1 ${secimModu ? "bg-[var(--accent)] text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
        >
          {secimModu ? "Seçimi kapat" : "Seç"}
        </button>
      </div>
      <div className={`glass overflow-x-auto rounded-2xl`}>
        <table
          data-sutun-ayari="kapali"
          className="table-fixed text-left text-sm [@media(pointer:coarse)]:[--ac-sutun:52px]"
          style={{ width: `calc(${toplamGenislik}px + var(--ac-sutun, 0px))` }}
        >
          <colgroup>
            {secimModu && <col style={{ width: secimSutunu }} />}
            {gorunurSutunlar.map((anahtar) => (
              <col
                key={anahtar}
                style={{ width: genislikler[anahtar] ?? VARSAYILAN_GENISLIK }}
              />
            ))}
            {!secimModu && <col className="hidden [@media(pointer:coarse)]:table-column" style={{ width: 52 }} />}
          </colgroup>
          <thead className="text-white/50">
            <tr>
              {secimModu && (
                <th className="sticky left-0 z-10 bg-[var(--yuzey,#1c2432)] p-0">
                  <div className="flex h-9 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={hepsiSecili}
                      ref={(el) => {
                        if (el) el.indeterminate = seciliIdler.length > 0 && !hepsiSecili;
                      }}
                      onChange={hepsiniDegistir}
                      aria-label="Tümünü seç"
                      title="Tümünü seç"
                      className="onay-kutusu"
                    />
                  </div>
                </th>
              )}
              {gorunurSutunlar.map((anahtar) => (
                <SutunBasligi
                  key={anahtar}
                  ilk={anahtar === gorunurSutunlar[0]}
                  etiket={sutunEtiketleri[anahtar] ?? anahtar}
                  aciklama={DAVA_DOSYALARI_SUTUN_ACIKLAMALARI[anahtar]}
                  genislik={genislikler[anahtar] ?? VARSAYILAN_GENISLIK}
                  filtre={
                    FILTRE_DEGERLERI[anahtar] ? (
                      <SutunFiltresi
                        etiket={sutunEtiketleri[anahtar] ?? anahtar}
                        degerler={filtreDegerleri(anahtar)}
                        gizli={sutunFiltreleri[anahtar] ?? []}
                        degistir={(g) => filtreDegistir(anahtar, g)}
                        rozetSinifi={anahtar === "durum" ? (d) => dosyaDurumSinifi(durumKodlari.get(d)) : undefined}
                      />
                    ) : undefined
                  }
                  suruklemeBaslat={(e) => genislikSuruklemeBaslat(anahtar, e)}
                  siralanabilir
                  suruklenen={suruklenenSutun === anahtar}
                  hedefMi={hedefSutun === anahtar && suruklenenSutun !== null && suruklenenSutun !== anahtar}
                  hedefSag={hedefSag}
                  suruklemeBasladi={() => setSuruklenenSutun(anahtar)}
                  suruklemeUzerinde={(sag) => {
                    if (!suruklenenSutun) return;
                    setHedefSutun(anahtar);
                    setHedefSag(sag);
                  }}
                  suruklemeBirakildi={(sag) => {
                    if (suruklenenSutun) sutunTasi(suruklenenSutun, anahtar, sag);
                    setSuruklenenSutun(null);
                    setHedefSutun(null);
                  }}
                  suruklemeBitti={() => {
                    setSuruklenenSutun(null);
                    setHedefSutun(null);
                  }}
                  etiketKaydet={etiketDuzenlenebilir ? (yeni) => sutunAdiniKaydet(anahtar, yeni) : undefined}
                />
              ))}
              {/* Son sutunun sagindaki bos alan: buraya birakilan sutun en sona gider. */}
              <th
                aria-hidden
                className="p-0"
                onDragOver={(e) => {
                  if (suruklenenSutun) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (suruklenenSutun) sutunTasi(suruklenenSutun, null, true);
                  setSuruklenenSutun(null);
                  setHedefSutun(null);
                }}
              />
              {!secimModu && (
                <th className="sticky right-0 hidden w-[52px] bg-[var(--yuzey,#1c2432)] p-0 [@media(pointer:coarse)]:table-cell" />
              )}
            </tr>
          </thead>
          <tbody>
            {satirlar.map(({ dosya, seviye, altSayisi }) => (
              <tr
                key={dosya.id}
                data-satir-id={dosya.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a,button,input,label,select,details")) return;
                  setAktifId(dosya.id);
                  if (window.matchMedia("(pointer: coarse)").matches) satirdanAc(e, dosya.id, true);
                }}
                onDoubleClick={(e) => {
                  if (!window.matchMedia("(pointer: coarse)").matches) satirdanAc(e, dosya.id, false);
                }}
                className={`group/satir border-t border-white/[0.06] hover:bg-white/[0.04] [@media(pointer:fine)]:cursor-pointer ${secim.has(dosya.id) ? "bg-[var(--accent-soft)]" : ""} ${aktifId === dosya.id ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] shadow-[inset_3px_0_0_var(--accent)]" : ""}`}
              >
                {secimModu && (
                  <td className={`sticky left-0 z-10 p-0 ${secim.has(dosya.id) ? "bg-[color-mix(in_srgb,var(--yuzey,#1c2432),var(--accent)_22%)]" : "bg-[var(--yuzey,#1c2432)]"}`}>
                    <div className="flex h-12 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={secim.has(dosya.id)}
                        onChange={() => secimiDegistir(dosya.id)}
                        aria-label="Dosyayı seç"
                        className="onay-kutusu"
                      />
                    </div>
                  </td>
                )}
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
                {!secimModu && (
                  <td className="sticky right-0 hidden bg-[var(--yuzey,#1c2432)] p-0 [@media(pointer:coarse)]:table-cell">
                    <div className="flex items-center justify-center px-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/kokpit/dava-dosyalari/${dosya.id}`)}
                        aria-label="Dosyayı aç"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-white/55 active:bg-white/15 active:text-white"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {dosyalar.length === 0 && (
              <tr>
                <td
                  colSpan={gorunurSutunlar.length + (secimModu ? 1 : 0)}
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
