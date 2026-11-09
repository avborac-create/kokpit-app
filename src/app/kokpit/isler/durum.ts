export const DURUMLAR = [
  { anahtar: "BASLATILMADI", ad: "Başlamadı", renk: "#94a3b8" },
  { anahtar: "BASLATILDI", ad: "Yapılıyor", renk: "#3b82f6" },
  { anahtar: "DONULECEK", ad: "Dönülecek", renk: "#f59e0b" },
  { anahtar: "TAMAMLANDI", ad: "Kapalı", renk: "#22c55e" },
] as const;

export type IsDurumu = (typeof DURUMLAR)[number]["anahtar"];

export function durumBilgisi(anahtar: string) {
  return DURUMLAR.find((d) => d.anahtar === anahtar) ?? DURUMLAR[0];
}

export const TURLER = [
  { anahtar: "PARCA", ad: "Parça görev", kisa: "Parça", aciklama: "Yap bitir, bir daha önüne gelmez (ör. bir dosyaya vekil kaydı girmek)", renk: "#3b82f6" },
  { anahtar: "ARTCI", ad: "Artçı görev", kisa: "Artçı", aciklama: "Ana işten sonra mecburen yapılan, para kazandırmayan işler (ör. haciz sonrası masraf föyü verip işlemek, veri girişi, tarama)", renk: "#a78bfa" },
  { anahtar: "SUREC", ad: "Süreç görev", kisa: "Süreç", aciklama: "Uzun süre gündemde kalır, takip ister (ör. icra takibi: açılıştan kesinleşmeye)", renk: "#f59e0b" },
  { anahtar: "OPERASYONEL", ad: "Periyodik görev", kisa: "Periyodik", aciklama: "Belli aralıklarla (hafta, ay, yıl) düzenli yapılır (ör. tebligatları indirmek: haftada 3 kez)", renk: "#14b8c4" },
  { anahtar: "DONEMSEL", ad: "Dönemsel görev", kisa: "Dönemsel", aciklama: "Bir olay olduğunda gündeme gelir (ör. müvekkil talep ettiğinde)", renk: "#ec4899" },
] as const;

// Tasnif: kullanicinin kendi gorevlerini onem sirasina gore ayirmasi (Ana / Yan). Bos = siniflandirilmamis.
export const SINIFLAR = [
  { anahtar: "ANA", ad: "Ana görev", renk: "#f2b04c" },
  { anahtar: "YAN", ad: "Yan görev", renk: "#9fb4ff" },
] as const;

export function sinifBilgisi(anahtar: string | null | undefined) {
  return SINIFLAR.find((s) => s.anahtar === anahtar) ?? null;
}

export const ZAMAN_BASKILARI = [
  { anahtar: "SON_GUN", ad: "Son günlü", tarihEtiketi: "Son gün", renk: "#ef4444", aciklama: "Günü kaçarsa sorumluluk doğar" },
  { anahtar: "TESLIM", ad: "Teslimli", tarihEtiketi: "Teslim", renk: "#f59e0b", aciklama: "Teslim tarihi vardır" },
] as const;

export function zamanBaskisiBilgisi(anahtar: string | null | undefined) {
  return ZAMAN_BASKILARI.find((z) => z.anahtar === anahtar) ?? null;
}

export function turBilgisi(anahtar: string) {
  return TURLER.find((t) => t.anahtar === anahtar) ?? TURLER[0];
}
