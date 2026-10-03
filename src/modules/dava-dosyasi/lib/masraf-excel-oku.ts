import ExcelJS from "exceljs";
import { normalize, type HamSatir } from "./masraf-tasnif";

// Excel (.xlsx) okuma: veritabanindan ve sunucu aksiyonundan bagimsiz saf
// yardimci (bkz. masraf-aktar-actions.ts) - boylece tek basina test edilebilir.
const BASLIK_ESLEMELERI: Record<keyof Omit<HamSatir, "satirNo" | "digerMetinler">, RegExp> = {
  tarih: /^tarih/,
  excelTur: /^tur/,
  tutar: /^(tutar|miktar)/,
  excelCariKod: /^cari kod/,
  aciklama: /^(aciklama|ek aciklama)/,
};

// Excel hucre degerini duz metne/sayiya/tarihe cevirir (formul, zengin metin).
function hucreDegeri(deger: ExcelJS.CellValue): string | number | Date | null {
  if (deger === null || deger === undefined) return null;
  if (deger instanceof Date) return deger;
  if (typeof deger === "number" || typeof deger === "string") return deger;
  if (typeof deger === "boolean") return null;
  if (typeof deger === "object") {
    if ("result" in deger && deger.result !== undefined) return hucreDegeri(deger.result as ExcelJS.CellValue);
    if ("richText" in deger) return deger.richText.map((r) => r.text).join("");
    if ("text" in deger) return String(deger.text);
  }
  return null;
}

function sayiyaCevir(deger: string | number | Date | null): number | null {
  if (typeof deger === "number") return deger;
  if (typeof deger === "string") {
    const temiz = deger.replace(/[^\d,.-]/g, "");
    // 1.234,56 -> 1234.56 ; 1234.56 -> 1234.56
    const n = Number(temiz.includes(",") ? temiz.replace(/\./g, "").replace(",", ".") : temiz);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function tarihiCevir(deger: string | number | Date | null): string | null {
  if (deger instanceof Date) {
    // Excel tarihleri UTC gece yarisi gelir; yerel gun kaymasini onlemek icin UTC alinir.
    return deger.toISOString().slice(0, 10);
  }
  if (typeof deger === "string") {
    const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(deger.trim());
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

export async function excelSatirlariniOku(girdi: ArrayBuffer): Promise<HamSatir[]> {
  const kitap = new ExcelJS.Workbook();
  await kitap.xlsx.load(girdi);
  const sayfa = kitap.worksheets[0];
  if (!sayfa) throw new Error("Excel dosyasında sayfa bulunamadı.");

  // Baslik satirini ilk 15 satir icinde "tarih" iceren satir olarak bul.
  let baslikSatiri = 0;
  for (let r = 1; r <= Math.min(15, sayfa.rowCount); r++) {
    const metinler = (sayfa.getRow(r).values as ExcelJS.CellValue[]).map((v) => normalize(String(hucreDegeri(v) ?? "")));
    if (metinler.some((m) => /^tarih/.test(m))) {
      baslikSatiri = r;
      break;
    }
  }
  if (!baslikSatiri) throw new Error('Başlık satırı bulunamadı. İlk satırlarda "Tarihi" başlıklı bir sütun olmalı.');

  const basliklar = sayfa.getRow(baslikSatiri).values as ExcelJS.CellValue[];
  const sutunlar: Partial<Record<keyof typeof BASLIK_ESLEMELERI, number>> = {};
  const taninanSutunlar = new Set<number>();
  basliklar.forEach((b, i) => {
    const m = normalize(String(hucreDegeri(b) ?? ""));
    for (const [alan, desen] of Object.entries(BASLIK_ESLEMELERI) as [keyof typeof BASLIK_ESLEMELERI, RegExp][]) {
      if (sutunlar[alan] === undefined && desen.test(m)) {
        sutunlar[alan] = i;
        taninanSutunlar.add(i);
      }
    }
  });
  if (!sutunlar.tutar) throw new Error('"Tutarı" sütunu bulunamadı.');

  const satirlar: HamSatir[] = [];
  for (let r = baslikSatiri + 1; r <= sayfa.rowCount; r++) {
    const deger = sayfa.getRow(r).values as ExcelJS.CellValue[];
    const al = (i?: number) => (i ? hucreDegeri(deger[i]) : null);
    const tutar = sayiyaCevir(al(sutunlar.tutar));
    const tarih = tarihiCevir(al(sutunlar.tarih));
    const aciklama = String(al(sutunlar.aciklama) ?? "").trim();
    const excelTur = String(al(sutunlar.excelTur) ?? "").trim();
    // Tamamen bos (yalniz onay kutulari olan) satirlari atla.
    if (tutar === null && !tarih && !aciklama && !excelTur) continue;

    // Basligi taninmayan sutunlardaki METINLER ipucu olarak toplanir ("Kasa/Iade/Psf"
    // gibi mantiksal sutunlar hucreDegeri'nde null doner, otomatik elenir).
    const digerMetinler: string[] = [];
    for (let i = 1; i < deger.length; i++) {
      if (taninanSutunlar.has(i)) continue;
      const v = hucreDegeri(deger[i]);
      if (typeof v === "string" && v.trim()) digerMetinler.push(v.trim());
    }

    satirlar.push({
      satirNo: r,
      tarih,
      excelTur,
      excelCariKod: String(al(sutunlar.excelCariKod) ?? "").trim(),
      aciklama,
      digerMetinler,
      tutar,
    });
  }
  return satirlar;
}

