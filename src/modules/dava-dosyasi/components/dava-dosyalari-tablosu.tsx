"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { davaDosyalariniListele } from "@/modules/dava-dosyasi/lib/queries";
import { Dugme } from "@/core/ui/button";
import { DavaDosyasiSilmeButonu } from "./dava-dosyasi-silme-butonu";

type Dosya = Awaited<ReturnType<typeof davaDosyalariniListele>>[number];

type SutunAnahtari =
  | "kokpitNo"
  | "dosyaNo"
  | "tur"
  | "birim"
  | "konu"
  | "karsiTaraf"
  | "muvekkiller"
  | "durum"
  | "sorumluAvukat";

// "Islemler" (Duzenle/Sil) BILEREK bu listede degil - veri degil, eylem
// sutunu; her zaman en sonda sabit kalir (bkz. render).
const VARSAYILAN_SUTUN_SIRASI: SutunAnahtari[] = [
  "kokpitNo",
  "dosyaNo",
  "tur",
  "birim",
  "konu",
  "karsiTaraf",
  "muvekkiller",
  "durum",
  "sorumluAvukat",
];

const SUTUN_ETIKETLERI: Record<SutunAnahtari, string> = {
  kokpitNo: "Kokpit No",
  dosyaNo: "Dosya No",
  tur: "Tür",
  birim: "Birim",
  konu: "Konu",
  karsiTaraf: "Karşı Taraf",
  muvekkiller: "Müvekkil(ler)",
  durum: "Durum",
  sorumluAvukat: "Sorumlu Avukat",
};

// Bu ekrana ozel, tarayici basina (localStorage) bir tercih - Ayarlar >
// Menu/Form Duzeni'ndeki gibi tum kullanicilar icin ortak bir admin ayari
// DEGIL, "kullanici istedigi gibi siralayabilsin" talebi geregi kisiye
// ozel kalir (bkz. kenar-cubugu.tsx'teki ayni desen - useSyncExternalStore
// ile SSR/hydration uyumsuzlugu olmadan).
const SUTUN_SIRASI_ANAHTARI = "kokpit-dava-dosyalari-sutun-sirasi";
const dinleyiciler = new Set<() => void>();

// KRITIK: useSyncExternalStore, getSnapshot'un referansca AYNI kalan bir
// deger dondurmesini sart kosar (Object.is ile karsilastirir) - aksi
// halde "degisti" sanip surekli yeniden render eder, bu da SONSUZ DONGUYE
// (React #185 "Maximum update depth exceeded") yol acar. sutunSirasiOku
// her cagrildiginda JSON.parse ile YENI bir dizi urettigi icin bu hataya
// dusuyordu (gercek bir surukle-birak testinde yakalandi) - cozum: ham
// localStorage degeri degismedigi surece AYNI dizi referansini onbellekten
// donmek.
let onbellek: { ham: string | null; sonuc: SutunAnahtari[] | null } = { ham: undefined as unknown as string, sonuc: null };

function sutunSirasiOku(): SutunAnahtari[] | null {
  let ham: string | null;
  try {
    ham = localStorage.getItem(SUTUN_SIRASI_ANAHTARI);
  } catch {
    ham = null;
  }
  if (ham === onbellek.ham) return onbellek.sonuc;

  let sonuc: SutunAnahtari[] | null = null;
  if (ham) {
    try {
      const kayitli = (JSON.parse(ham) as string[]).filter((a): a is SutunAnahtari =>
        (VARSAYILAN_SUTUN_SIRASI as string[]).includes(a),
      );
      if (kayitli.length > 0) {
        // Sonradan eklenmis ama kullanicinin eski kayitli sirasinda hic
        // olmayan bir sutun varsa (ör. yeni bir sutun eklendiginde) sona
        // eklenir - kaybolmaz.
        const eksikler = VARSAYILAN_SUTUN_SIRASI.filter((a) => !kayitli.includes(a));
        sonuc = [...kayitli, ...eksikler];
      }
    } catch {
      sonuc = null;
    }
  }
  onbellek = { ham, sonuc };
  return sonuc;
}

function sutunSirasiYaz(sira: SutunAnahtari[]) {
  try {
    localStorage.setItem(SUTUN_SIRASI_ANAHTARI, JSON.stringify(sira));
  } catch {
    // localStorage erisilemez (gizli sekme vb.) - sessizce yok say
  }
  dinleyiciler.forEach((dinleyici) => dinleyici());
}

function sutunSirasiAbone(dinleyici: () => void) {
  dinleyiciler.add(dinleyici);
  return () => dinleyiciler.delete(dinleyici);
}

// Uzun metinlerin satir yuksekligini sismesine izin vermek yerine tek
// satirda kalip "..." ile kesilmesi icin - tam metin `title` ile imlec
// uzerine gelince gorulebilir.
function KisaMetin({ children, genislik = "10rem" }: { children: React.ReactNode; genislik?: string }) {
  const metin = typeof children === "string" ? children : undefined;
  return (
    <div className="truncate" style={{ maxWidth: genislik }} title={metin}>
      {children}
    </div>
  );
}

// Hedef sayfa bir sunucu bileşeni olduğu için tıklama ile ekranın fiilen
// değişmesi arasında (veri çekme süresince) fark edilir bir boşluk
// oluşabiliyor - useTransition'ın isPending'i tam da bu bekleme süresini
// yansıttığı için (bkz. onayli-buton.tsx'teki aynı desen) tıklanan satırda
// anında "Açılıyor…" göstererek tepkisiz kalmıyor.
//
// Listeden dogrudan DUZENLEME formuna degil, DOSYA DETAYINA gidilir -
// duzenleme zaten detay sayfasinin kendi "Duzenle" butonundan yapilir
// (bkz. dava-dosyalari/[id]/page.tsx). Boylece "Islemler" sutunundaki
// buton, Kokpit No baglantisiyla ayni hedefe gider ama listede cok daha
// belirgin/tiklanabilir bir hedef olur (kullanici geri bildirimi).
function DosyayiAcButonu({ href }: { href: string }) {
  const router = useRouter();
  const [beklemede, baslatTransition] = useTransition();
  return (
    <Dugme
      type="button"
      varyant="ikincil"
      disabled={beklemede}
      onClick={() => baslatTransition(() => router.push(href))}
    >
      {beklemede ? "Açılıyor…" : "Dosyayı Aç"}
    </Dugme>
  );
}

function sutunHucresiOlustur(anahtar: SutunAnahtari, dosya: Dosya): React.ReactNode {
  switch (anahtar) {
    case "kokpitNo":
      return (
        <Link
          href={`/kokpit/dava-dosyalari/${dosya.id}`}
          className="font-medium text-white hover:text-[#6db8ff] hover:underline"
        >
          KP-{String(dosya.kayitNo).padStart(4, "0")}
        </Link>
      );
    case "dosyaNo":
      return <KisaMetin genislik="8rem">{dosya.dosyaNo ?? "—"}</KisaMetin>;
    case "tur": {
      const altEtiket = (dosya.icraAltTuru ?? dosya.yargiKolu)?.etiket;
      return (
        <KisaMetin genislik="10rem">
          {dosya.tur?.etiket ?? "—"}
          {altEtiket ? ` (${altEtiket})` : ""}
        </KisaMetin>
      );
    }
    case "birim":
      return <KisaMetin genislik="10rem">{dosya.birimAdi ?? "—"}</KisaMetin>;
    case "konu":
      return <KisaMetin genislik="12rem">{dosya.konu}</KisaMetin>;
    case "karsiTaraf":
      return (
        <KisaMetin genislik="10rem">
          {dosya.karsiTaraflar.length > 0
            ? dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ")
            : "—"}
        </KisaMetin>
      );
    case "muvekkiller":
      return (
        <KisaMetin genislik="10rem">
          {dosya.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—"}
        </KisaMetin>
      );
    case "durum":
      return (
        <KisaMetin genislik="9rem">
          <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
            {dosya.durum.etiket}
          </span>
        </KisaMetin>
      );
    case "sorumluAvukat":
      return <KisaMetin genislik="9rem">{dosya.sorumluAvukat?.adSoyad ?? "—"}</KisaMetin>;
  }
}

export function DavaDosyalariTablosu({
  dosyalar,
  silmeYetkisiVar,
}: {
  dosyalar: Dosya[];
  silmeYetkisiVar: boolean;
}) {
  // Kalici siralama SADECE localStorage'da tutulur (useSyncExternalStore -
  // SSR'da ve ilk client render'inda hep null donup hydration uyumsuzlugu
  // engellenir, bkz. kenar-cubugu.tsx'teki ayni desen). Surukleme SIRASINDA
  // canli onizleme icinse ayri, gecici bir state (suruklemeSirasi) kullanilir
  // - boylece kalici degeri "efekt icinde setState" yapmadan (react-hooks/
  // set-state-in-effect) direkt render'da turetebiliriz.
  const kayitliSira = useSyncExternalStore(sutunSirasiAbone, sutunSirasiOku, () => null);
  const temelSira = kayitliSira ?? VARSAYILAN_SUTUN_SIRASI;
  const [suruklemeSirasi, setSuruklemeSirasi] = useState<SutunAnahtari[] | null>(null);
  const [suruklenenAnahtar, setSuruklenenAnahtar] = useState<SutunAnahtari | null>(null);
  const sira = suruklemeSirasi ?? temelSira;

  function uzerineGelince(hedefAnahtar: SutunAnahtari) {
    if (!suruklenenAnahtar || suruklenenAnahtar === hedefAnahtar) return;
    setSuruklemeSirasi((onceki) => {
      const kaynak = onceki ?? temelSira;
      const kaynakIndex = kaynak.indexOf(suruklenenAnahtar);
      const hedefIndex = kaynak.indexOf(hedefAnahtar);
      if (kaynakIndex === -1 || hedefIndex === -1) return kaynak;
      const yeni = [...kaynak];
      const [tasinan] = yeni.splice(kaynakIndex, 1);
      yeni.splice(hedefIndex, 0, tasinan);
      return yeni;
    });
  }

  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            {sira.map((anahtar) => (
              <th
                key={anahtar}
                draggable
                onDragStart={() => setSuruklenenAnahtar(anahtar)}
                onDragEnter={() => uzerineGelince(anahtar)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  setSuruklenenAnahtar(null);
                  setSuruklemeSirasi((guncel) => {
                    if (guncel) sutunSirasiYaz(guncel);
                    return null;
                  });
                }}
                onDragEnd={() => setSuruklenenAnahtar(null)}
                title="Sütunu sürükleyerek yeniden sıralayabilirsiniz"
                className={`cursor-grab select-none whitespace-nowrap px-4 py-3 font-medium active:cursor-grabbing ${
                  suruklenenAnahtar === anahtar ? "opacity-40" : ""
                }`}
              >
                <span className="mr-1 text-white/25">⠿</span>
                {SUTUN_ETIKETLERI[anahtar]}
              </th>
            ))}
            <th className="px-4 py-3 font-medium">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {dosyalar.map((dosya) => (
            <tr key={dosya.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
              {sira.map((anahtar) => (
                <td key={anahtar} className={`px-4 py-3 ${anahtar === "konu" ? "text-white/85" : "text-white/60"}`}>
                  {sutunHucresiOlustur(anahtar, dosya)}
                </td>
              ))}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <DosyayiAcButonu href={`/kokpit/dava-dosyalari/${dosya.id}`} />
                  {silmeYetkisiVar && <DavaDosyasiSilmeButonu dosyaId={dosya.id} />}
                </div>
              </td>
            </tr>
          ))}
          {dosyalar.length === 0 && (
            <tr>
              <td colSpan={sira.length + 1} className="px-4 py-8 text-center text-white/40">
                Kayıt bulunamadı.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
