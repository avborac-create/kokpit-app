// Cari hesaplar alaninin (Dosya/Muvekkil Ekonomisi > Cari hesaplar) gorunum tercihleri.
// Buro varsayilani + kisisel tercih: kisi degistirmediyse buro varsayilani, o da yoksa VARSAYILAN gecerlidir.
// ("use server" dosyalarindan sabit export edilemedigi icin sabitler burada durur.)

export const CARI_GORUNUM_ANAHTARI = "cari-hesaplar";
export const BURO_SAHIBI = "buro";

export const CARI_GORUNUM_SECENEKLERI = {
  yerlesim: [
    ["kutular", "Eşit kutular"],
    ["sutun", "Üç eşit sütun"],
    ["izgara", "Eşit ızgara"],
    ["sekme", "Grup sekmeleri"],
    ["tablo", "Hesap planı tablosu"],
    ["klasik", "Eski düzen"],
  ],
  genislik: [
    ["oto2", "Otomatik · iki satır"],
    ["oto1", "Otomatik · tek satır"],
    ["elle", "Elle"],
  ],
  ozet: [
    ["baslik", "Grup başlığında"],
    ["ilk", "İlk sırada"],
    ["alt", "En altta, toplam gibi"],
  ],
  baslik: [
    ["yazi", "Düz yazı"],
    ["kutu", "Renkli kutu"],
    ["kart", "Kart, büyük tutar"],
    ["serit", "Üstte şerit"],
    ["sade", "Yalnız ad"],
  ],
  bakiye: [
    ["dolu", "Yalnız bakiyesi olanlar"],
    ["hepsi", "Hepsi (sıfırlar soluk)"],
    ["yok", "Gösterme"],
  ],
  ad: [
    ["ayri", "101 · Para Trafiği"],
    ["tire", "101 - Para Trafiği"],
    ["ad", "Yalnız ad"],
  ],
  bos: [
    ["goster", "Göster"],
    ["soluk", "Soluk göster"],
    ["gizle", "Gizle"],
  ],
  yogunluk: [
    ["siki", "Sıkı"],
    ["normal", "Normal"],
    ["ferah", "Ferah"],
  ],
  renk: [
    ["acik", "Renkli"],
    ["kapali", "Tek renk"],
  ],
} as const;

type Secenekler = typeof CARI_GORUNUM_SECENEKLERI;
export type CariGorunumAlani = keyof Secenekler;
export type CariGorunum = { [K in CariGorunumAlani]: Secenekler[K][number][0] } & { genislikPx: number };

export const GENISLIK_MIN = 110;
export const GENISLIK_MAX = 240;

export const VARSAYILAN_CARI_GORUNUM: CariGorunum = {
  yerlesim: "kutular",
  genislik: "oto2",
  genislikPx: 130,
  ozet: "baslik",
  baslik: "yazi",
  bakiye: "dolu",
  ad: "ayri",
  bos: "goster",
  yogunluk: "normal",
  renk: "acik",
};

// Kayitli (JSON) ya da istemciden gelen degeri dogrular; taninmayan/eksik alanlar varsayilana duser.
export function cariGorunumCozumle(ham: unknown): CariGorunum {
  let veri: Record<string, unknown> = {};
  try {
    const v = typeof ham === "string" ? JSON.parse(ham) : ham;
    if (v && typeof v === "object") veri = v as Record<string, unknown>;
  } catch {
    // bozuk kayit: varsayilan
  }
  const sonuc: Record<string, unknown> = { ...VARSAYILAN_CARI_GORUNUM };
  for (const alan of Object.keys(CARI_GORUNUM_SECENEKLERI) as CariGorunumAlani[]) {
    const gecerli = CARI_GORUNUM_SECENEKLERI[alan].map((s) => s[0]) as readonly string[];
    if (typeof veri[alan] === "string" && gecerli.includes(veri[alan] as string)) sonuc[alan] = veri[alan];
  }
  const px = Number(veri.genislikPx);
  if (Number.isFinite(px)) sonuc.genislikPx = Math.min(GENISLIK_MAX, Math.max(GENISLIK_MIN, Math.round(px)));
  return sonuc as CariGorunum;
}
