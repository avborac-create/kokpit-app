// Haftanin baslangici: Pazartesi 00:00 (Istanbul, UTC+3).
export function buHaftaBasi(simdi = new Date()): Date {
  const TR = 3 * 3600 * 1000;
  const yerel = new Date(simdi.getTime() + TR);
  const gun = (yerel.getUTCDay() + 6) % 7;
  const pzt = Date.UTC(yerel.getUTCFullYear(), yerel.getUTCMonth(), yerel.getUTCDate() - gun);
  return new Date(pzt - TR);
}

export const PERIYOTLAR = [
  { anahtar: "HAFTA", ad: "Hafta", birim: "Haftada", bu: "Bu hafta" },
  { anahtar: "AY", ad: "Ay", birim: "Ayda", bu: "Bu ay" },
  { anahtar: "YIL", ad: "Yıl", birim: "Yılda", bu: "Bu yıl" },
] as const;

// Periyodik gorevin icinde bulunulan donemin baslangici (Istanbul saati).
export function donemBasi(periyot: string, simdi = new Date()): Date {
  if (periyot === "HAFTA") return buHaftaBasi(simdi);
  const TR = 3 * 3600 * 1000;
  const yerel = new Date(simdi.getTime() + TR);
  const ay = periyot === "AY" ? yerel.getUTCMonth() : 0;
  return new Date(Date.UTC(yerel.getUTCFullYear(), ay, 1) - TR);
}

export function periyotBilgisi(periyot: string) {
  return PERIYOTLAR.find((p) => p.anahtar === periyot) ?? PERIYOTLAR[0];
}
