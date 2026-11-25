/** T.C. kimlik no: 11 hane, ilk hane 0 degil, son iki hane sağlama kuralına uymalı. */
export function tcknGecerliMi(t: string): boolean {
  if (!/^[1-9]\d{10}$/.test(t)) return false;
  const d = t.split("").map(Number);
  const on = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10;
  const onBir = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d[9] === (on + 10) % 10 && d[10] === onBir;
}
