// KOKPİT'in ust kenarinda (Chrome/Notion tarzi) birden fazla sekmede
// calisma imkani saglayan, React state DEGIL harici (module-level) bir
// depo - kenar-cubugu.tsx'teki "Dosyalar acik/kapali" tercihiyle ayni
// nedenle: bir bileşenin useEffect'i icinde React'in kendi setState'ini
// DOGRUDAN cagirmak react-hooks/set-state-in-effect kuralina takilir;
// bunun yerine mutasyonlar bu harici depoda yapilir, degisiklik
// dinleyicilere bildir() ile duyurulur, React tarafi sadece
// useSyncExternalStore ile bu depoyu OKUR. Sekmeler bir hesap/veritabani
// kaydi DEGIL - sadece bu cihaza/tarayiciya ozel, localStorage'da tutulan
// bir calisma masasi duzenidir.
export type Sekme = {
  id: string;
  yol: string;
  baslik: string;
  // true ise baslik <SekmeBasligi> ile elle (ör. musteri adi) ayarlandi;
  // false ise varsayilanSekmeBasligi(yol)'dan otomatik turetildi.
  ozelBaslikMi: boolean;
};

type Durum = { sekmeler: Sekme[]; aktifId: string };

const DEPO_ANAHTARI = "kokpit-sekmeler-v1";

let durum: Durum = {
  sekmeler: [{ id: "ilk", yol: "/kokpit", baslik: "Ana Sayfa", ozelBaslikMi: false }],
  aktifId: "ilk",
};
// Sunucu (SSR) VE hidrasyon oncesi istemci render'i icin sabit, hep AYNI
// referansi donduren bir anlik goruntu - localStorage sunucuda yoktur,
// bu yuzden gercek kayitli sekmeler yalniza asagidaki depoyuYukle() ile
// (mount sonrasi bir effect'ten) devreye girer; boylece hidrasyon
// uyumsuzlugu olusmaz.
const SUNUCU_DURUMU: Durum = durum;

let yuklendiMi = false;
const dinleyiciler = new Set<() => void>();

function idUret(): string {
  return Math.random().toString(36).slice(2, 10);
}

function bildir() {
  dinleyiciler.forEach((dinleyici) => dinleyici());
}

function kaydet() {
  try {
    localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(durum));
  } catch {
    // localStorage erisilemez (gizli sekme vb.) - sessizce yok say
  }
}

export function anlikGoruntuAl(): Durum {
  return durum;
}

export function sunucuAnlikGoruntusuAl(): Durum {
  return SUNUCU_DURUMU;
}

export function abone(dinleyici: () => void): () => void {
  dinleyiciler.add(dinleyici);
  return () => dinleyiciler.delete(dinleyici);
}

// Ilk client mount'ta bir kez cagrilir: localStorage'daki kayitli
// sekmeleri geri yukler. Kayit yoksa/bozuksa mevcut sayfayi tek sekme
// olarak birakir. Sonraki cagrilar (yuklendiMi sayesinde) no-op'tur.
export function depoyuYukle(gecerliYol: string, varsayilanBaslik: string) {
  if (yuklendiMi) return;
  yuklendiMi = true;
  try {
    const ham = localStorage.getItem(DEPO_ANAHTARI);
    if (ham) {
      const ayristirilmis = JSON.parse(ham) as Durum;
      if (Array.isArray(ayristirilmis.sekmeler) && ayristirilmis.sekmeler.length > 0) {
        durum = {
          sekmeler: ayristirilmis.sekmeler,
          aktifId: ayristirilmis.sekmeler.some((s) => s.id === ayristirilmis.aktifId)
            ? ayristirilmis.aktifId
            : ayristirilmis.sekmeler[0].id,
        };
        bildir();
        return;
      }
    }
  } catch {
    // bozuk/erisilemez kayit - tek sekmelik varsayilanla devam
  }
  const ilkSekmeId = idUret();
  durum = {
    sekmeler: [{ id: ilkSekmeId, yol: gecerliYol, baslik: varsayilanBaslik, ozelBaslikMi: false }],
    aktifId: ilkSekmeId,
  };
  bildir();
}

// Aktif sekmenin yolunu/basligini gecerli rotayla senkronlar - kullanici
// sekme cubugu DISINDA (sol menu, bir baglanti) gezindiginde de aktif
// sekme guncel sayfayi yansitsin diye. Sekme cubugundan bilerek
// degistirmede (sekmeyeGec/yeniSekmeAc) hedef sekmenin yolu zaten
// pathname'e esit olacagindan burasi no-op kalir, ozel basliklar
// (SekmeBasligi ile ayarlanan) korunur.
export function aktifYoluSenkronla(pathname: string, varsayilanBaslik: string) {
  const aktif = durum.sekmeler.find((s) => s.id === durum.aktifId);
  if (!aktif || aktif.yol === pathname) return;
  durum = {
    ...durum,
    sekmeler: durum.sekmeler.map((s) =>
      s.id === durum.aktifId ? { ...s, yol: pathname, baslik: varsayilanBaslik, ozelBaslikMi: false } : s,
    ),
  };
  kaydet();
  bildir();
}

// Asagidaki mutatorlar geri donus degeri olarak, cagiranin (bkz.
// use-sekmeler.ts) router.push ile gitmesi gereken yolu dondurur - bu
// depo saf durum tutar, navigasyon React tarafinda kalir.

export function sekmeyeGec(id: string): string | null {
  const hedef = durum.sekmeler.find((s) => s.id === id);
  if (!hedef) return null;
  durum = { ...durum, aktifId: id };
  kaydet();
  bildir();
  return hedef.yol;
}

export function sekmeKapat(id: string): string | null {
  if (durum.sekmeler.length <= 1) return null;
  const kapatilanIndex = durum.sekmeler.findIndex((s) => s.id === id);
  if (kapatilanIndex === -1) return null;
  const kalanlar = durum.sekmeler.filter((s) => s.id !== id);
  let hedefYol: string | null = null;
  let yeniAktifId = durum.aktifId;
  if (id === durum.aktifId) {
    const yeniAktif = kalanlar[Math.max(0, kapatilanIndex - 1)] ?? kalanlar[0];
    yeniAktifId = yeniAktif.id;
    hedefYol = yeniAktif.yol;
  }
  durum = { sekmeler: kalanlar, aktifId: yeniAktifId };
  kaydet();
  bildir();
  return hedefYol;
}

export function yeniSekmeAc(): string {
  const yeni: Sekme = { id: idUret(), yol: "/kokpit", baslik: "Ana Sayfa", ozelBaslikMi: false };
  durum = { sekmeler: [...durum.sekmeler, yeni], aktifId: yeni.id };
  kaydet();
  bildir();
  return yeni.yol;
}

export function aktifBasligiAyarla(baslik: string) {
  durum = {
    ...durum,
    sekmeler: durum.sekmeler.map((s) => (s.id === durum.aktifId ? { ...s, baslik, ozelBaslikMi: true } : s)),
  };
  kaydet();
  bildir();
}
