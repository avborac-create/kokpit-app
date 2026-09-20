import { resendIstemcisiGetir } from "@/core/email/resend-istemcisi";
import { HACIZ_ISLEMI_DURUMU_ETIKETLERI, TEMINAT_MUVAFAKAT_ETIKETLERI } from "./sabitler";
import type { hacizRaporuGetir } from "./queries";

type HacizRaporuDetay = NonNullable<Awaited<ReturnType<typeof hacizRaporuGetir>>>;

// Haciz raporu her girildiğinde bilgilendirilecek sabit alıcılar -
// kullanıcının kendi talebiyle eklendi. İleride kişi bazlı/yapılandırılabilir
// hale getirilmesi gerekirse (ör. Ayarlar üzerinden), bu tek satır
// değiştirilir.
const BILDIRIM_ALICILARI = ["info@eceshukuk.com", "bora.colakoglu@eceshukuk.com"];

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
const paraFormatlayici = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function satirHtml(etiket: string, deger: string): string {
  return `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap;vertical-align:top;">${etiket}</td><td style="padding:4px 0;color:#111;">${deger}</td></tr>`;
}

function hacizRaporuBildirimHtmlOlustur(rapor: HacizRaporuDetay): string {
  const muvekkiller = rapor.davaDosyasi.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—";
  const dosyaBilgisi = rapor.davaDosyasi.dosyaNo
    ? `${rapor.davaDosyasi.dosyaNo} — ${rapor.davaDosyasi.konu}`
    : rapor.davaDosyasi.konu;

  const satirlar = [
    satirHtml("Haciz Tarihi", tarihFormatlayici.format(rapor.hacizTarihi)),
    satirHtml("Avukat", rapor.avukat.adSoyad),
    satirHtml("Dosya", dosyaBilgisi),
    satirHtml("Müvekkil(ler)", muvekkiller),
    satirHtml("İşlem Yapılan Borçlular", rapor.islemYapilanBorclular),
    satirHtml("Muhafaza", HACIZ_ISLEMI_DURUMU_ETIKETLERI[rapor.muhafazaDurumu]),
    satirHtml("İstihkak", HACIZ_ISLEMI_DURUMU_ETIKETLERI[rapor.istihkakDurumu]),
    satirHtml("Kıymet Takdiri", HACIZ_ISLEMI_DURUMU_ETIKETLERI[rapor.kiymetTakdiriDurumu]),
    satirHtml("Teminat İadesine Muvafakat", TEMINAT_MUVAFAKAT_ETIKETLERI[rapor.teminatIadesineMuvafakat]),
    satirHtml("Tahsilat Miktarı", `${paraFormatlayici.format(Number(rapor.tahsilatMiktari))} TL`),
    satirHtml("Tahsilat Kanalı", rapor.tahsilatKanali?.etiket ?? "—"),
    satirHtml("Belge Sayısı", `${rapor.belgeler.length}`),
  ];
  if (rapor.avukatGorusu) {
    satirlar.push(satirHtml("Avukat Görüşü", rapor.avukatGorusu));
  }

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;">
      <h2 style="margin:0 0 4px;font-size:18px;">Yeni Haciz Raporu</h2>
      <p style="margin:0 0 16px;color:#666;font-size:13px;">
        Kokpit &gt; Haciz Artçıları'na yeni bir rapor girildi.
      </p>
      <table style="border-collapse:collapse;font-size:14px;">${satirlar.join("")}</table>
      <p style="margin:16px 0 0;color:#999;font-size:12px;">
        Belgeleri ve tam raporu görüntülemek/indirmek için Kokpit uygulamasında
        Haciz Artçıları bölümüne gidin.
      </p>
    </div>
  `;
}

// Rapor kaydedildikten SONRA cagirilir, best-effort - hicbir zaman hata
// firlatmaz (RESEND_API_KEY eksikse ya da Resend API'sine ulasilamazsa
// sadece loglar). Bildirim gonderilememesi, zaten basariyla kaydedilmis
// bir haciz raporunu asla geri almamali/kullaniciya hata olarak
// gosterilmemeli.
export async function hacizRaporuBildirimGonder(rapor: HacizRaporuDetay): Promise<void> {
  const resend = resendIstemcisiGetir();
  if (!resend) {
    console.warn(
      "RESEND_API_KEY tanımlı değil - haciz raporu bildirim e-postası gönderilmedi (rapor kaydı etkilenmedi).",
    );
    return;
  }

  const gonderen = process.env.HACIZ_RAPORU_BILDIRIM_GONDEREN || "Kokpit <onboarding@resend.dev>";

  try {
    const sonuc = await resend.emails.send({
      from: gonderen,
      to: BILDIRIM_ALICILARI,
      subject: `Yeni Haciz Raporu - ${rapor.avukat.adSoyad}`,
      html: hacizRaporuBildirimHtmlOlustur(rapor),
    });
    if (sonuc.error) {
      console.error("Haciz raporu bildirim e-postası gönderilemedi:", sonuc.error);
    }
  } catch (hata) {
    console.error("Haciz raporu bildirim e-postası gönderilemedi:", hata);
  }
}
