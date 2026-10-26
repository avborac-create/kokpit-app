import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

export type EkDosya = { ad: string; tur: "pdf" | "resim"; bayt: Uint8Array };

export const EK_AZAMI_ADET = 10;
export const EK_AZAMI_TOPLAM_BAYT = 4 * 1024 * 1024; // Vercel istek govdesi sinirina (4,5 MB) sigsin

const A4 = { genislik: 595.28, yukseklik: 841.89 };

// "2026_213_Tahsilat_Makbuzu_20_10_2026.pdf" -> "2026 213 Tahsilat Makbuzu 20 10 2026"
export function ekGorunenAd(dosyaAdi: string): string {
  return dosyaAdi.replace(/\.(pdf|png|jpe?g|webp|tiff?|html?)$/i, "").replace(/_/g, " ").trim();
}

export function ekTuruBul(dosyaAdi: string, mime: string): EkDosya["tur"] | null {
  const ad = dosyaAdi.toLowerCase();
  if (mime === "application/pdf" || ad.endsWith(".pdf")) return "pdf";
  if (/^image\/(png|jpeg|webp|tiff)$/.test(mime) || /\.(png|jpe?g|webp|tiff?)$/.test(ad)) return "resim";
  return null;
}

// Ana belgenin PDF'ine, sirayla EK-1, EK-2... olarak ekleri ekler. Her ekin ilk sayfasinin sag ustune
// kucuk bir "EK-n" etiketi basilir (yalniz ASCII: yerlesik yazi tipinde Turkce karakter yoktur).
export async function ekleriBirlestir(anaPdf: Uint8Array, ekler: EkDosya[]): Promise<Uint8Array> {
  if (ekler.length === 0) return anaPdf;
  const hedef = await PDFDocument.load(anaPdf);
  const yaziTipi = await hedef.embedFont(StandardFonts.HelveticaBold);

  for (const [i, ek] of ekler.entries()) {
    const etiket = `EK-${i + 1}`;
    let ilkSayfa;

    if (ek.tur === "pdf") {
      const kaynak = await PDFDocument.load(ek.bayt, { ignoreEncryption: false });
      const sayfalar = await hedef.copyPages(kaynak, kaynak.getPageIndices());
      sayfalar.forEach((s) => hedef.addPage(s));
      ilkSayfa = sayfalar[0];
    } else {
      // Resim: PNG/JPEG dogrudan, digerleri (webp/tiff) sharp ile JPEG'e cevrilerek gomulur.
      let resim;
      try {
        resim = await hedef.embedJpg(ek.bayt);
      } catch {
        try {
          resim = await hedef.embedPng(ek.bayt);
        } catch {
          const sharp = (await import("sharp")).default;
          const jpeg = await sharp(Buffer.from(ek.bayt)).rotate().jpeg({ quality: 88 }).toBuffer();
          resim = await hedef.embedJpg(new Uint8Array(jpeg));
        }
      }
      const sayfa = hedef.addPage([A4.genislik, A4.yukseklik]);
      const kenar = 28;
      const oran = Math.min((A4.genislik - 2 * kenar) / resim.width, (A4.yukseklik - 2 * kenar - 14) / resim.height, 1.6);
      const g = resim.width * oran;
      const y = resim.height * oran;
      sayfa.drawImage(resim, { x: (A4.genislik - g) / 2, y: A4.yukseklik - kenar - 14 - y, width: g, height: y });
      ilkSayfa = sayfa;
    }

    etiketBas(ilkSayfa, etiket, yaziTipi);
  }
  return hedef.save();
}

// Sayfanin GORUNEN sag ustune "EK-n" kutusu basar; sayfa dondurulmus (90/180/270) olsa da dik gorunur.
function etiketBas(sayfa: ReturnType<PDFDocument["addPage"]>, etiket: string, yaziTipi: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  const { width: W, height: H } = sayfa.getSize();
  const r = ((sayfa.getRotation().angle % 360) + 360) % 360;
  const gorunenGenislik = r % 180 === 0 ? W : H;
  const gorunenYukseklik = r % 180 === 0 ? H : W;
  const kutuG = yaziTipi.widthOfTextAtSize(etiket, 9) + 12;
  const kutuY = 16;
  // gorunen koordinat (vx, vy) -> sayfanin kendi koordinati
  const donustur = (vx: number, vy: number) => {
    if (r === 90) return { x: W - vy, y: vx };
    if (r === 180) return { x: W - vx, y: H - vy };
    if (r === 270) return { x: vy, y: H - vx };
    return { x: vx, y: vy };
  };
  const kutu = donustur(gorunenGenislik - kutuG - 14, gorunenYukseklik - 26);
  const yazi = donustur(gorunenGenislik - kutuG - 8, gorunenYukseklik - 21);
  sayfa.drawRectangle({ x: kutu.x, y: kutu.y, width: kutuG, height: kutuY, rotate: degrees(r), color: rgb(0.96, 0.96, 0.97), borderColor: rgb(0.82, 0.82, 0.84), borderWidth: 0.6 });
  sayfa.drawText(etiket, { x: yazi.x, y: yazi.y, size: 9, font: yaziTipi, rotate: degrees(r), color: rgb(0.11, 0.11, 0.12) });
}
