// Haftanin baslangici: Pazartesi 00:00 (Istanbul, UTC+3).
export function buHaftaBasi(simdi = new Date()): Date {
  const TR = 3 * 3600 * 1000;
  const yerel = new Date(simdi.getTime() + TR);
  const gun = (yerel.getUTCDay() + 6) % 7;
  const pzt = Date.UTC(yerel.getUTCFullYear(), yerel.getUTCMonth(), yerel.getUTCDate() - gun);
  return new Date(pzt - TR);
}
