// Bir klasordeki CMK dosyasi evraklarini Kokpit'e aktarir (tek seferlik).
//   node -r dotenv/config scripts/cmk-evrak-aktar.mjs "<klasor>" --kuru   -> yalniz dosyalari isler, DB'ye YAZMAZ
//   node -r dotenv/config scripts/cmk-evrak-aktar.mjs "<klasor>"          -> CMK kaydini ve evraklari yazar
// CMK kaydi (birim + dosyaNo) varsa yeniden olusturulmaz; ayni ad+klasorde evrak varsa atlanir.
import { PrismaClient } from "@prisma/client";
import JSZip from "jszip";
import sharp from "sharp";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

const klasor = process.argv[2];
const kuru = process.argv.includes("--kuru");
// --alt-klasor="22 EKİM GÜNÜ": yalniz o alt klasordeki dosyalar (daha once yuklenenler tekrar islenmez)
// --ozel-eposta=admin@...: bu alt klasordeki evraklar "AVUKATA OZEL" olarak o kullaniciya yazilir
const secenek = (ad) => process.argv.find((a) => a.startsWith("--" + ad + "="))?.slice(ad.length + 3);
const sadeceAltKlasor = secenek("alt-klasor");
const ozelEposta = secenek("ozel-eposta");
if (!klasor) throw new Error("Klasor yolu verin.");

const DOSYA = {
  adSoyad: "Ferhat Türkmen",
  birim: "İstanbul Anadolu 20. Ağır Ceza Mahkemesi",
  dosyaNo: "2025/176",
  suc: "Bilişim sistemleri, banka veya kredi kurumlarının araç olarak kullanılması suretiyle dolandırıcılık (TCK 158/1-f, 158/3)",
  dosyaDurumu: "DURUSMASI_BEKLENIYOR",
  durusmaTarihi: new Date("2026-12-03T11:28:00"),
  notlar:
    "Ferhat Türkmen iddianamede şüpheli 2; hakkında 06.03.2025 tarihli yakalama kararı var.\n" +
    "02.07.2026 (6. celse): yakalama emri infaz edilemedi, devamına karar verildi; Ferhat için barodan müdafi talebinin akıbeti soruldu. Sonraki duruşma 03.12.2026 11:28.\n" +
    "Diğer şüpheliler: Abdülsamet Eytiz, Harun Sönmez, Mücahit Sanca.\n" +
    "Müştekiler: Cengiz Gülmez ve Emre Gülmez (toplam zarar 127.000 TL). Soruşturma No 2024/267476, İddianame No 2025/3596.",
};

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME = { pdf: "application/pdf", tif: "image/tiff", tiff: "image/tiff", udf: "application/vnd.uyap.udf", docx: DOCX_MIME, png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

function tarihBul(ad) {
  const e = ad.match(/(\d{2})[_.-](\d{2})[_.-](\d{4})/);
  return e ? new Date(`${e[3]}-${e[2]}-${e[1]}T12:00:00Z`) : null;
}

function gorunenAd(ad) {
  return ad
    .replace(/\.(udf\.pdf|udf|pdf|tif|tiff|docx|png|jpe?g)$/i, "")
    .replace(/(\d{2})[_.-](\d{2})[_.-](\d{4})/g, "$1.$2.$3")
    .replace(/(^|[^\d])(\d{4})_(\d{1,6})(?=_|$)/, "$1$2/$3")
    .replace(/_/g, " ")
    .trim();
}

function klasorBul(altKlasor, ad) {
  if (altKlasor === "22 EKİM GÜNÜ") return "22 Ekim Günü";
  if (altKlasor === "DURUŞMALAR") return "Duruşma Zabıtları";
  if (altKlasor === "İFADELER") return "İfadeler";
  if (/[iİ]ddianame/i.test(ad)) return "İddianame";
  if (/ARAMA|TUTANAK/i.test(ad)) return "Tutanaklar";
  if (/ŞİKAYET/i.test(ad)) return "Şikayet";
  return "Diğer";
}

async function hazirla(ad, icerik) {
  const uzanti = ad.toLowerCase().split(".").pop();
  const mimeTipi = MIME[uzanti] ?? "application/octet-stream";
  if (uzanti === "pdf") return { mimeTipi, onizlemeTuru: "PDF", onizleme: null, onizlemeMime: null, metin: null };
  if (uzanti === "tif" || uzanti === "tiff") {
    const png = await sharp(icerik, { pages: 1 }).rotate().png().toBuffer();
    return { mimeTipi, onizlemeTuru: "RESIM", onizleme: png, onizlemeMime: "image/png", metin: null };
  }
  if (uzanti === "docx") {
    const zip = await JSZip.loadAsync(icerik);
    const var_ = Boolean(zip.file("word/document.xml"));
    return { mimeTipi, onizlemeTuru: var_ ? "METIN" : "YOK", onizleme: null, onizlemeMime: null, metin: null };
  }
  if (uzanti === "png" || uzanti === "jpg" || uzanti === "jpeg") {
    return { mimeTipi, onizlemeTuru: "RESIM", onizleme: null, onizlemeMime: null, metin: null };
  }
  if (uzanti === "udf") {
    const zip = await JSZip.loadAsync(icerik);
    const xml = await zip.file("content.xml")?.async("string");
    const m = xml?.match(/<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>/);
    const metin = m ? m[1].replace(/\r\n/g, "\n").trim() : null;
    return { mimeTipi, onizlemeTuru: metin ? "METIN" : "YOK", onizleme: null, onizlemeMime: null, metin };
  }
  return { mimeTipi, onizlemeTuru: "YOK", onizleme: null, onizlemeMime: null, metin: null };
}

function dosyalariTopla() {
  const sonuc = [];
  for (const ad of readdirSync(klasor)) {
    const tam = path.join(klasor, ad);
    if (statSync(tam).isDirectory()) {
      for (const alt of readdirSync(tam)) sonuc.push({ altKlasor: ad, ad: alt, tam: path.join(tam, alt) });
    } else {
      sonuc.push({ altKlasor: "", ad, tam });
    }
  }
  // Ayni iddianamenin hem .udf hem .udf.pdf hali varsa yalniz PDF alinir; bos (0 bayt) dosyalar atlanir.
  return sonuc.filter((d) => {
    if (statSync(d.tam).size === 0) return false;
    if (/\.udf$/i.test(d.ad) && sonuc.some((x) => x.ad === `${d.ad}.pdf`)) return false;
    if (sadeceAltKlasor && d.altKlasor !== sadeceAltKlasor) return false;
    return /\.(pdf|tif|tiff|udf|docx|png|jpe?g)$/i.test(d.ad);
  });
}

const prisma = new PrismaClient();

async function main() {
  const dosyalar = dosyalariTopla();
  let cmk = null;
  if (!kuru) {
    cmk =
      (await prisma.cMKDosyasi.findUnique({ where: { birim_dosyaNo: { birim: DOSYA.birim, dosyaNo: DOSYA.dosyaNo } } })) ??
      (await prisma.cMKDosyasi.create({
        data: { ...DOSYA, smsGonderilebilirMi: false, cmkGorevlendirmeVarMi: true },
      }));
    console.log(`CMK dosyasi: ${cmk.id}`);
  }

  // "Avukata ozel" alt klasoru: evraklar yalniz bu kullaniciya yazilir.
  let ozelKullaniciId = null;
  if (ozelEposta && sadeceAltKlasor) {
    const k = await prisma.kullanici.findUnique({ where: { eposta: ozelEposta }, select: { id: true } });
    if (!k) throw new Error(`Kullanici bulunamadi: ${ozelEposta}`);
    ozelKullaniciId = k.id;
  }

  for (const d of dosyalar) {
    const icerik = readFileSync(d.tam);
    const hazir = await hazirla(d.ad, icerik);
    const kayit = {
      klasor: klasorBul(d.altKlasor, d.ad),
      // Ayni adli dosya birden fazla klasorde olabilir (ör. iddianamenin 22 Ekim kopyasi): ayirt etmek icin ek yazilir.
      ad: gorunenAd(d.ad) + (d.altKlasor === "22 EKİM GÜNÜ" && /[iİ]ddianame/i.test(d.ad) ? " — 22 Ekim kopyası" : ""),
      // Dosya adinda tarih yoksa alt klasor "22 EKİM" ise o gun, degilse bos birakilir.
      evrakTarihi: tarihBul(d.ad) ?? (d.altKlasor === "22 EKİM GÜNÜ" ? new Date("2026-10-22T12:00:00Z") : null),
      mimeTipi: hazir.mimeTipi,
      boyutBayt: icerik.length,
      onizlemeTuru: hazir.onizlemeTuru,
    };
    const ozet = `${kayit.klasor} | ${kayit.ad} | ${kayit.evrakTarihi?.toISOString().slice(0, 10) ?? "tarihsiz"} | ${hazir.onizlemeTuru} | metin ${hazir.metin?.length ?? 0} krk | onizleme ${hazir.onizleme?.length ?? 0} bayt`;
    if (kuru) {
      console.log(`[kuru] ${ozet}`);
      continue;
    }
    const var_ = await prisma.cMKEvrak.findFirst({ where: { cmkDosyasiId: cmk.id, klasor: kayit.klasor, ad: kayit.ad, ozelKullaniciId } });
    if (var_) {
      console.log(`atlandi (var): ${kayit.ad}`);
      continue;
    }
    await prisma.cMKEvrak.create({
      data: {
        cmkDosyasiId: cmk.id,
        ozelKullaniciId,
        ...kayit,
        icerik: {
          create: {
            orijinalAd: d.ad,
            orijinal: icerik,
            onizleme: hazir.onizleme,
            onizlemeMime: hazir.onizlemeMime,
            metin: hazir.metin,
          },
        },
      },
    });
    console.log(`yuklendi: ${ozet}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
