import JSZip from "jszip";

// UYAP Doküman Editörü'nde açılabilen basit UDF (format_id 1.8) üretici.
// UDF = içinde content.xml bulunan zip. Metin CDATA'da durur; her paragraf, metindeki
// aralığına (startOffset/length, sondaki "\n" dahil) işaret eder.
export type UdfSatiri = {
  metin: string;
  kalin?: boolean;
  hiza?: "sol" | "orta" | "sag" | "iki-yana"; // UDF Alignment: 0 sol, 1 orta, 2 sağ, 3 iki yana
  ilkSatirGirintisi?: boolean;
};

const HIZA = { sol: 0, orta: 1, sag: 2, "iki-yana": 3 } as const;

export async function udfUret(satirlar: UdfSatiri[]): Promise<{ udf: Buffer; duzMetin: string }> {
  // "]]>" CDATA'yı bozar; metne girmesin.
  const temiz = satirlar.map((s) => ({ ...s, metin: s.metin.replace(/\r/g, "").replace(/\n/g, " ").replace(/]]>/g, "] ]>") }));
  let metin = "";
  const paragraflar = temiz
    .map((s) => {
      const baslangic = metin.length;
      metin += `${s.metin}\n`;
      const uzunluk = s.metin.length + 1;
      const nitelik = [`Alignment="${HIZA[s.hiza ?? "sol"]}"`, s.ilkSatirGirintisi ? `FirstLineIndent="0.71428573"` : ""].filter(Boolean).join(" ");
      return `<paragraph ${nitelik}><content${s.kalin ? ' bold="true"' : ""} family="Times New Roman" size="12" startOffset="${baslangic}" length="${uzunluk}" /></paragraph>`;
    })
    .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8" ?>\n\n<template format_id="1.8" >\n` +
    `<content><![CDATA[${metin}]]></content>` +
    `<properties><pageFormat mediaSizeName="1" leftMargin="42.51968479156494" rightMargin="42.51968479156494" topMargin="42.51968479156494" bottomMargin="42.51968479156494" paperOrientation="1" headerFOffset="14.17322826385498" footerFOffset="14.17322826385498" /></properties>\n` +
    `<elements resolver="hvl-default" >\n${paragraflar}\n</elements>\n` +
    `<styles><style name="default" description="Geçerli" family="Dialog" size="12" bold="false" italic="false" foreground="-13421773" /><style name="hvl-default" family="Times New Roman" size="12" description="Gövde" /></styles>\n</template>`;

  const zip = new JSZip();
  zip.file("content.xml", xml);
  const udf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return { udf, duzMetin: metin };
}
