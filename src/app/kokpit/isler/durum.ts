export const DURUMLAR = [
  { anahtar: "BASLATILMADI", ad: "Başlatılmadı", renk: "#94a3b8" },
  { anahtar: "BASLATILDI", ad: "Başlatıldı", renk: "#3b82f6" },
  { anahtar: "DONULECEK", ad: "Dönülecek", renk: "#f59e0b" },
  { anahtar: "TAMAMLANDI", ad: "Tamamlandı", renk: "#22c55e" },
] as const;

export type IsDurumu = (typeof DURUMLAR)[number]["anahtar"];

export function durumBilgisi(anahtar: string) {
  return DURUMLAR.find((d) => d.anahtar === anahtar) ?? DURUMLAR[0];
}
