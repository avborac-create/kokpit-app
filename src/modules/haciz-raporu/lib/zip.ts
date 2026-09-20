import JSZip from "jszip";
import path from "node:path";
import type { hacizRaporuGetir } from "./queries";
import { belgeIcerigiGetir } from "./depo";
import { hacizRaporuPdfUret } from "./pdf";
import { BELGE_DOSYA_ADLARI, HACIZ_RAPORU_PDF_ADI } from "./sabitler";

type HacizRaporuDetay = NonNullable<Awaited<ReturnType<typeof hacizRaporuGetir>>>;

const klasorAdiIcinTarihFormatlayici = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// "Tek tıkla indir" istegi: haciz tarihini tasiyan TEK bir klasor, icinde
// her belge turu (fotograflar HARIC) ayri birer PDF olarak. Google
// Form'daki "tarayip Drive'a yukle" akisinin yerini alir - avukat artik
// sadece bu ZIP'i indirir, elle klasorlemez.
export async function hacizRaporuZipOlustur(rapor: HacizRaporuDetay): Promise<Buffer> {
  const zip = new JSZip();
  const klasorAdi = `Haciz - ${klasorAdiIcinTarihFormatlayici.format(rapor.hacizTarihi).replaceAll("/", ".")}`;
  const klasor = zip.folder(klasorAdi)!;

  const raporPdfBuffer = await hacizRaporuPdfUret(rapor);
  klasor.file(HACIZ_RAPORU_PDF_ADI, raporPdfBuffer);

  let fotografSirasi = 1;
  for (const belge of rapor.belgeler) {
    const icerik = await belgeIcerigiGetir(belge.depoUrl);
    if (belge.tur === "FOTOGRAF") {
      const uzanti = path.extname(belge.adOnerisi) || ".jpg";
      klasor.file(`${BELGE_DOSYA_ADLARI.FOTOGRAF} ${fotografSirasi}${uzanti}`, icerik);
      fotografSirasi += 1;
    } else {
      klasor.file(BELGE_DOSYA_ADLARI[belge.tur], icerik);
    }
  }

  return zip.generateAsync({ type: "nodebuffer" });
}
