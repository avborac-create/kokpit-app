import JSZip from "jszip";

// UYAP UDF -> HTML. UDF, content.xml icinde (1) CDATA olarak duz metni ve
// (2) <elements> altinda paragraf/parca bicimlerini (hizalama, kalin, punto,
// girinti) startOffset/length ile metne bagli olarak tutar. Burada bu bicimler
// A4 sayfa gorunumune cevrilir. Tum metin kacislanir; cikti guvenli HTML'dir.

function kac(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ozellikler(ham: string): Record<string, string> {
  const sonuc: Record<string, string> = {};
  for (const m of ham.matchAll(/([A-Za-z_]+)="([^"]*)"/g)) sonuc[m[1]] = m[2];
  return sonuc;
}

const HIZALAMA = ["left", "center", "right", "justify"];

function sayi(deger: string | undefined, varsayilan = 0): number {
  const n = Number(deger);
  return Number.isFinite(n) ? n : varsayilan;
}

export async function udfHtmlUret(icerik: Buffer): Promise<string | null> {
  let xml: string | undefined;
  try {
    const zip = await JSZip.loadAsync(icerik);
    xml = await zip.file("content.xml")?.async("string");
  } catch {
    return null;
  }
  const cdata = xml?.match(/<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>/);
  if (!xml || !cdata) return null;
  const metin = cdata[1].replace(/\r\n/g, "\n");

  const sayfa = xml.match(/<pageFormat\b([^>]*)\/?>/);
  const sayfaOz = sayfa ? ozellikler(sayfa[1]) : {};
  const solBosluk = sayi(sayfaOz.leftMargin, 42.5);
  const sagBosluk = sayi(sayfaOz.rightMargin, 42.5);
  const ustBosluk = sayi(sayfaOz.topMargin, 42.5);

  const govde = (xml.split("<elements")[1] ?? "").replace(/<(header|footer)\b[\s\S]*?<\/\1>/g, "");
  const paragraflar: string[] = [];

  for (const p of govde.matchAll(/<paragraph\b([^>]*?)(?:\/>|>([\s\S]*?)<\/paragraph>)/g)) {
    const oz = ozellikler(p[1]);
    const cocuklar = p[2] ?? "";
    let icHtml = "";
    for (const c of cocuklar.matchAll(/<(content|field|space|tab)\b([^>]*?)\/?>/g)) {
      const co = ozellikler(c[2]);
      const bas = sayi(co.startOffset);
      const uzunluk = sayi(co.length);
      const parca = metin.substr(bas, uzunluk).replace(/\n$/, "");
      if (parca === "") continue;
      const stil: string[] = [];
      if (co.size) stil.push(`font-size:${sayi(co.size, 12)}pt`);
      if (co.bold === "true") stil.push("font-weight:700");
      if (co.italic === "true") stil.push("font-style:italic");
      if (co.underline === "true") stil.push("text-decoration:underline");
      if (co.family) stil.push(`font-family:'${co.family.replace(/[^A-Za-z0-9 ]/g, "")}',serif`);
      icHtml += `<span style="${stil.join(";")}">${kac(parca)}</span>`;
    }
    const stil = [
      `text-align:${HIZALAMA[sayi(oz.Alignment)] ?? "left"}`,
      `margin:${sayi(oz.SpaceAbove)}pt 0 ${sayi(oz.SpaceBelow)}pt ${sayi(oz.LeftIndent)}pt`,
      `text-indent:${sayi(oz.FirstLineIndent)}pt`,
      `font-size:${sayi(oz.size, 12)}pt`,
    ];
    paragraflar.push(`<p style="${stil.join(";")}">${icHtml || "<br>"}</p>`);
  }

  if (paragraflar.length === 0) {
    paragraflar.push(`<p style="white-space:pre-wrap">${kac(metin)}</p>`);
  }

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
html{background:#e9ebf0}
body{margin:0;padding:16px;font-family:'Times New Roman',Times,serif;color:#111}
.sayfa{box-sizing:border-box;width:595pt;max-width:100%;margin:0 auto;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.25);min-height:842pt;padding:${ustBosluk}pt ${sagBosluk}pt 40pt ${solBosluk}pt}
p{white-space:pre-wrap;tab-size:8;line-height:1.25;word-wrap:break-word;margin-top:0}
</style></head><body><div class="sayfa">${paragraflar.join("")}</div></body></html>`;
}
