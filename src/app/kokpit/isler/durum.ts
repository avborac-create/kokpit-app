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
  { anahtar: "SUREC", ad: "Süreç görev", kisa: "Süreç", aciklama: "Uzun süre gündemde kalır, takip ister (ör. icra takibi: açılıştan kesinleşmeye)", renk: "#f59e0b" },
  { anahtar: "OPERASYONEL", ad: "Periyodik görev", kisa: "Periyodik", aciklama: "Belli aralıklarla (hafta, ay, yıl) düzenli yapılır (ör. tebligatları indirmek: haftada 3 kez)", renk: "#14b8c4" },
] as const;

export function turBilgisi(anahtar: string) {
  return TURLER.find((t) => t.anahtar === anahtar) ?? TURLER[0];
}
