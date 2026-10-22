import JSZip from "jszip";
import { SAYFA_DUGME_VE_BETIK, SAYFA_EK_CSS } from "@/modules/cmk-dosyalari/lib/sayfa-kabugu";

// Word (.docx) -> HTML onizleme. docx bir ZIP'tir; metin word/document.xml'de, bicim
// (kalin, egik, punto, hizalama, girinti, stiller) word/styles.xml'de durur. Burada
// yaygin bicimler A4 sayfa gorunumune cevrilir; tum metin kacislanir.

function kac(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function xmlCoz(s: string): string {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

type Bicim = { b?: boolean; i?: boolean; u?: boolean; sz?: number; renk?: string; aile?: string; hizala?: string; once?: number; sonra?: number };

const HIZALAMA: Record<string, string> = { left: "left", start: "left", center: "center", right: "right", end: "right", both: "justify", distribute: "justify" };

function ac(xml: string, etiket: string): string | null {
  const m = xml.match(new RegExp(`<w:${etiket}\\b([^>]*?)/?>`));
  return m ? m[1] : null;
}
function deger(oz: string | null): string | null {
  const m = oz?.match(/w:val="([^"]*)"/);
  return m ? m[1] : null;
}
function acik(xml: string, etiket: string): boolean | undefined {
  const oz = ac(xml, etiket);
  if (oz === null) return undefined;
  const v = deger(oz);
  return !(v === "0" || v === "false" || v === "none");
}

function runBicimi(rPr: string): Bicim {
  const bicim: Bicim = {};
  const b = acik(rPr, "b");
  if (b !== undefined) bicim.b = b;
  const i = acik(rPr, "i");
  if (i !== undefined) bicim.i = i;
  const u = acik(rPr, "u");
  if (u !== undefined) bicim.u = u;
  const sz = deger(ac(rPr, "sz"));
  if (sz) bicim.sz = Number(sz) / 2;
  const renk = deger(ac(rPr, "color"));
  if (renk && /^[0-9A-Fa-f]{6}$/.test(renk)) bicim.renk = `#${renk}`;
  const aile = ac(rPr, "rFonts")?.match(/w:ascii="([^"]*)"/)?.[1];
  if (aile) bicim.aile = aile;
  return bicim;
}

function paragrafBicimi(pPr: string): Bicim {
  const bicim: Bicim = {};
  const jc = deger(ac(pPr, "jc"));
  if (jc && HIZALAMA[jc]) bicim.hizala = HIZALAMA[jc];
  const aralik = ac(pPr, "spacing");
  if (aralik) {
    const once = aralik.match(/w:before="(\d+)"/)?.[1];
    const sonra = aralik.match(/w:after="(\d+)"/)?.[1];
    if (once) bicim.once = Number(once) / 20;
    if (sonra) bicim.sonra = Number(sonra) / 20;
  }
  return bicim;
}

export async function docxHtmlUret(icerik: Buffer): Promise<string | null> {
  let belge: string | undefined;
  let stillerXml = "";
  try {
    const zip = await JSZip.loadAsync(icerik);
    belge = await zip.file("word/document.xml")?.async("string");
    stillerXml = (await zip.file("word/styles.xml")?.async("string")) ?? "";
  } catch {
    return null;
  }
  if (!belge) return null;

  // Varsayilan punto/yazi tipi ve stiller
  const varsayilanRpr = stillerXml.match(/<w:docDefaults>[\s\S]*?<w:rPrDefault>([\s\S]*?)<\/w:rPrDefault>/)?.[1] ?? "";
  const varsayilan = runBicimi(varsayilanRpr);
  const varsayilanPunto = varsayilan.sz ?? 11;
  const varsayilanAile = varsayilan.aile ?? "Calibri";
  const stiller = new Map<string, { run: Bicim; par: Bicim }>();
  for (const m of stillerXml.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g)) {
    const rPr = m[2].match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] ?? "";
    const pPr = m[2].match(/<w:pPr>([\s\S]*?)<\/w:pPr>/)?.[1] ?? "";
    stiller.set(m[1], { run: runBicimi(rPr), par: paragrafBicimi(pPr) });
  }

  const sayfaMarj = belge.match(/<w:pgMar\b([^>]*?)\/?>/)?.[1] ?? "";
  const marj = (ad: string, yedek: number) => {
    const v = sayfaMarj.match(new RegExp(`w:${ad}="(\\d+)"`))?.[1];
    return v ? Number(v) / 20 : yedek;
  };

  function paragrafHtml(pXml: string, hucrede = false): string {
    const pPr = pXml.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/)?.[1] ?? "";
    const stilId = deger(ac(pPr, "pStyle"));
    const stil = (stilId && stiller.get(stilId)) || { run: {}, par: {} };
    const par = { ...stil.par, ...paragrafBicimi(pPr) };
    const girinti = ac(pPr, "ind") ?? "";
    const sol = Number(girinti.match(/w:(?:left|start)="(-?\d+)"/)?.[1] ?? 0) / 20;
    const ilkSatir = Number(girinti.match(/w:firstLine="(\d+)"/)?.[1] ?? 0) / 20 - Number(girinti.match(/w:hanging="(\d+)"/)?.[1] ?? 0) / 20;
    const listeMi = /<w:numPr>/.test(pPr);

    let ic = listeMi ? "• " : "";
    for (const r of pXml.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)) {
      const rXml = r[0];
      const rPr = rXml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] ?? "";
      const b = { ...stil.run, ...runBicimi(rPr) };
      let metin = "";
      for (const parca of rXml.matchAll(/<w:t\b[^>]*>([^<]*)<\/w:t>|<w:tab\s*\/>|<w:br\b[^>]*\/>/g)) {
        if (parca[0].startsWith("<w:tab")) metin += "\t";
        else if (parca[0].startsWith("<w:br")) metin += "\n";
        else metin += xmlCoz(parca[1] ?? "");
      }
      if (!metin) continue;
      const css: string[] = [];
      if (b.sz && b.sz !== varsayilanPunto) css.push(`font-size:${b.sz}pt`);
      if (b.b) css.push("font-weight:700");
      if (b.i) css.push("font-style:italic");
      if (b.u) css.push("text-decoration:underline");
      if (b.renk) css.push(`color:${b.renk}`);
      if (b.aile && b.aile !== varsayilanAile) css.push(`font-family:'${b.aile.replace(/[^A-Za-z0-9 ]/g, "")}',sans-serif`);
      ic += `<span${css.length ? ` style="${css.join(";")}"` : ""}>${kac(metin).replace(/\n/g, "<br>")}</span>`;
    }

    const css = [
      `text-align:${par.hizala ?? "left"}`,
      `margin:${par.once ?? 0}pt 0 ${par.sonra ?? (hucrede ? 2 : 8)}pt ${sol}pt`,
      `text-indent:${ilkSatir}pt`,
    ];
    return `<p style="${css.join(";")}">${ic || "<br>"}</p>`;
  }

  function tabloHtml(tXml: string): string {
    const satirlar = [...tXml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((tr) => {
      const hucreler = [...tr[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((tc) => {
        const ic = [...tc[0].matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((p) => paragrafHtml(p[0], true)).join("");
        return `<td>${ic}</td>`;
      });
      return `<tr>${hucreler.join("")}</tr>`;
    });
    return `<table>${satirlar.join("")}</table>`;
  }

  const govde = belge.split("<w:body>")[1] ?? belge;
  const parcalar: string[] = [];
  for (const m of govde.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>/g)) {
    parcalar.push(m[0].startsWith("<w:tbl") ? tabloHtml(m[0]) : paragrafHtml(m[0]));
  }
  if (parcalar.length === 0) return null;

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
html{background:#e9ebf0}
body{margin:0;padding:16px;font-family:'${varsayilanAile.replace(/[^A-Za-z0-9 ]/g, "")}',Calibri,Arial,sans-serif;font-size:${varsayilanPunto}pt;color:#111}
.sayfa{box-sizing:border-box;width:595pt;max-width:100%;margin:0 auto;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.25);min-height:842pt;padding:${marj("top", 72)}pt ${marj("right", 72)}pt 48pt ${marj("left", 72)}pt}
p{white-space:pre-wrap;line-height:1.3;word-wrap:break-word}
table{border-collapse:collapse;width:100%;margin:6pt 0}td{border:1px solid #bbb;padding:4pt;vertical-align:top}
${SAYFA_EK_CSS}
</style></head><body><div class="sayfa">${parcalar.join("")}</div>${SAYFA_DUGME_VE_BETIK}</body></html>`;
}
