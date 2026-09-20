import { Resend } from "resend";

let istemci: Resend | null = null;

// RESEND_API_KEY tanimli degilse null doner - COKMEZ. Bildirim e-postasi
// "olursa iyi olur" turunde bir yan etki; asil islem (ör. haciz raporu
// kaydi) e-posta gonderilemedigi icin BASARISIZ OLMAMALI. Cagiran taraf
// null durumunda sessizce (sadece loglayarak) vazgecer - bkz.
// haciz-raporu/lib/bildirim.ts.
export function resendIstemcisiGetir(): Resend | null {
  const anahtar = process.env.RESEND_API_KEY;
  if (!anahtar) return null;
  if (!istemci) istemci = new Resend(anahtar);
  return istemci;
}
