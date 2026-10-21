import JSZip from "jszip";

export type HazirlananEvrak = {
  mimeTipi: string;
  onizlemeTuru: "PDF" | "RESIM" | "METIN" | "YOK";
  onizleme: Buffer | null;
  onizlemeMime: string | null;
  metin: string | null;
};

const UZANTI_MIME: Record<string, string> = {
  pdf: "application/pdf",
  tif: "image/tiff",
  tiff: "image/tiff",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  udf: "application/vnd.uyap.udf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function mimeTahminEt(ad: string, bildirilen?: string): string {
  const uzanti = ad.toLowerCase().split(".").pop() ?? "";
  if (UZANTI_MIME[uzanti]) return UZANTI_MIME[uzanti];
  return bildirilen && bildirilen !== "" ? bildirilen : "application/octet-stream";
}

// UDF (UYAP Dokuman Formati) bir ZIP'tir; metin content.xml icindeki
// <content><![CDATA[...]]></content> bolumundedir.
export async function udfMetniCikar(icerik: Buffer): Promise<string | null> {
  try {
    const zip = await JSZip.loadAsync(icerik);
    const xml = await zip.file("content.xml")?.async("string");
    const eslesme = xml?.match(/<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>/);
    return eslesme ? eslesme[1].replace(/\r\n/g, "\n").trim() : null;
  } catch {
    return null;
  }
}

// Yuklenen dosyanin tarayicida gosterilebilecek bir onizlemesini uretir.
export async function evrakHazirla(ad: string, icerik: Buffer, bildirilenMime?: string): Promise<HazirlananEvrak> {
  const mimeTipi = mimeTahminEt(ad, bildirilenMime);
  if (mimeTipi === "application/pdf") {
    return { mimeTipi, onizlemeTuru: "PDF", onizleme: null, onizlemeMime: null, metin: null };
  }
  if (mimeTipi === "image/tiff") {
    try {
      const sharp = (await import("sharp")).default;
      const png = await sharp(icerik, { pages: 1 }).rotate().png().toBuffer();
      return { mimeTipi, onizlemeTuru: "RESIM", onizleme: png, onizlemeMime: "image/png", metin: null };
    } catch {
      return { mimeTipi, onizlemeTuru: "YOK", onizleme: null, onizlemeMime: null, metin: null };
    }
  }
  if (mimeTipi.startsWith("image/")) {
    return { mimeTipi, onizlemeTuru: "RESIM", onizleme: null, onizlemeMime: null, metin: null };
  }
  if (ad.toLowerCase().endsWith(".udf")) {
    const metin = await udfMetniCikar(icerik);
    return { mimeTipi, onizlemeTuru: metin ? "METIN" : "YOK", onizleme: null, onizlemeMime: null, metin };
  }
  return { mimeTipi, onizlemeTuru: "YOK", onizleme: null, onizlemeMime: null, metin: null };
}

// Dosya adindan tarih yakalar: "..._16_10_2025.udf" -> 2025-10-16
export function adindanTarihBul(ad: string): Date | null {
  const e = ad.match(/(\d{2})[_.-](\d{2})[_.-](\d{4})/);
  if (!e) return null;
  const tarih = new Date(`${e[3]}-${e[2]}-${e[1]}T12:00:00Z`);
  return Number.isNaN(tarih.getTime()) ? null : tarih;
}

// Dosya adindan okunur bir gorunen ad uretir: uzanti atilir, tarihler noktali (15.10.2025),
// esas no egik cizgili (2025/176) olur, kalan alt cizgiler bosluga donusur.
export function gorunenAdUret(ad: string): string {
  return ad
    .replace(/\.(udf\.pdf|udf|pdf|tif|tiff|jpg|jpeg|png|webp|docx)$/i, "")
    .replace(/(\d{2})[_.-](\d{2})[_.-](\d{4})/g, "$1.$2.$3")
    .replace(/(^|[^\d])(\d{4})_(\d{1,6})(?=_|$)/, "$1$2/$3")
    .replace(/_/g, " ")
    .trim();
}
