import { resendIstemcisiGetir } from "@/core/email/resend-istemcisi";

// Kokpit bildirim e-postasi: best-effort, hicbir zaman hata firlatmaz (asil islem bozulmasin).
export async function bildirimEpostasiGonder(alici: string, konu: string, metin: string, baglanti?: string): Promise<boolean> {
  const resend = resendIstemcisiGetir();
  if (!resend) return false;
  const gonderen = process.env.HACIZ_RAPORU_BILDIRIM_GONDEREN || "Kokpit <onboarding@resend.dev>";
  const kacis = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  try {
    const sonuc = await resend.emails.send({
      from: gonderen,
      to: [alici],
      subject: konu,
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#111"><p>${kacis(metin)}</p>${
        baglanti ? `<p><a href="${baglanti}" style="color:#0a64d8">Kokpit'te aç</a></p>` : ""
      }<p style="color:#888;font-size:12px">Eces Hukuk Bürosu · Kokpit</p></div>`,
    });
    if (sonuc.error) {
      console.error("Bildirim e-postasi gonderilemedi:", sonuc.error);
      return false;
    }
    return true;
  } catch (hata) {
    console.error("Bildirim e-postasi gonderilemedi:", hata);
    return false;
  }
}
