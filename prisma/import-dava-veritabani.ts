import { PrismaClient, type CMKDosyaDurumu } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "node:path";
import * as fs from "node:fs";

// ============================================================
// Eski Sistem Aktarımı: "Dava Veritabanı" Excel'i + sabit Ceza/CMK
// dosyaları -> Kokpit
// ============================================================
//
// Kullanım:
//   npm run import:dava-veritabani -- "/tam/yol/Dava Veritabani.xlsx"
// (veya IMPORT_XLSX_PATH ortam değişkeniyle)
//
// İlkeler (bkz. görev tanımı):
//  - Excel dosyasına HİÇ yazılmaz (readFile ile açılır, salt okunur).
//  - Mevcut Kokpit kayıtları SİLİNMEZ/GÜNCELLENMEZ - sadece EKLENİR.
//  - Her kaynak satır, "dava-veritabani-xlsx:{sayfa}:{satır}" biçiminde
//    sabit bir anahtarla (legacyKaynakAnahtari) işaretlenir; script tekrar
//    çalıştırıldığında bu anahtarla eşleşen kayıt ATLANIR (ne yeniden
//    oluşturulur ne de alanları ezilir - kullanıcı sonradan değiştirmiş
//    olabilir).
//  - Boş satırlar atlanır. Bir satırdaki hata tüm aktarımı DURDURMAZ;
//    başarılı satırlar aktarılır, sorunlu satırlar raporlanır.
//  - Kaynakta boş/geçersiz olan bilgi TAHMİN EDİLMEZ.
//  - Kokpit'in sade 6 alanına (Müvekkil, Karşı Taraf, Davanın/Takibin
//    Konusu, Birim Adı, Dosya Numarası, Dosya Durumu) karşılığı olmayan
//    tüm kaynak sütunları legacyImportData JSON alanında saklanır; hiçbir
//    otomatik finans hareketi/alt dosya türetilmez.

const prisma = new PrismaClient();

const KAYNAK_ETIKETI = "Dava Veritabanı Excel";
const SAYFA_ADI = "Dava Veritabanı";

// Beklenen sütun sırası (A..S) - başlık metinlerinde satır içi \n olduğu
// için isimle değil, INDEX ile okunuyor; ama başlıklar burada doğrulama
// amacıyla (\n -> boşluk normalize edilerek) tutuluyor.
const BEKLENEN_BASLIKLAR = [
  "TÜR",
  "DOSYA RUMUZ",
  "MÜVEKKİL",
  "KARŞI TARAF",
  "MÜVEKKİL KONUMU",
  "BİRİM ADI",
  "DOSYA NO",
  "İCRA DOSYASI",
  "TEHİR-İ İCRA",
  "UYAP'A KAYITLI VEKİL",
  "DAVA KONUSU",
  "DAVA DETAYI",
  "AÇAN KİŞİ",
  "SORUMLU",
  "AÇILIŞ TARİHİ",
  "DURUM KODU",
  "DAVA MASRAFI",
  "MASRAF MÜV. ALINDI MI",
  "NOTLAR",
];

const SUTUN = {
  tur: 0,
  dosyaRumuz: 1,
  muvekkil: 2,
  karsiTaraf: 3,
  muvekkilKonumu: 4,
  birimAdi: 5,
  dosyaNo: 6,
  icraDosyasi: 7,
  tehirIIcra: 8,
  uyapKayitliVekil: 9,
  davaKonusu: 10,
  davaDetayi: 11,
  acanKisi: 12,
  sorumlu: 13,
  acilisTarihi: 14,
  durumKodu: 15,
  davaMasrafi: 16,
  masrafMuvAlindiMi: 17,
  notlar: 18,
} as const;

// Kaynak "DURUM KODU" -> Kokpit ana dosya durumu (dava_dosyasi_durumu kod).
// Yalnız görev tanımındaki eşleme kullanılır; büyük/küçük harf ve baştaki/
// sondaki boşluklar normalize edilerek karşılaştırılır.
const DURUM_ESLEME: Record<string, string> = {
  "AÇILACAK": "acilacak",
  "DERDEST": "derdest",
  "BS. DERDEST": "derdest",
  "BOZMA SONRASI YENİ ESAS": "derdest",
  "KESİNLEŞTİ": "kapali",
};

function normUst(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLocaleUpperCase("tr-TR");
}

function normAd(s: string): string {
  return normUst(s);
}

function metinYaAlNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// Bozuk/hatalı formül hücreleri (ör. #VALUE!) bazen SheetJS tarafından
// anlamsız, uzak bir tarihe (ör. yıl 45794) çözümlenebiliyor - Postgres'in
// DateTime aralığının dışına taştığı için Prisma hata verir. Makul bir
// aralık dışına düşen her tarih GEÇERSİZ sayılır (tahmin etmek yerine
// "inceleme gerekli" listesine düşer).
const MIN_MAKUL_YIL = 1950;
const MAX_MAKUL_YIL = 2100;

function makulMu(d: Date): boolean {
  const yil = d.getUTCFullYear();
  return yil >= MIN_MAKUL_YIL && yil <= MAX_MAKUL_YIL;
}

// Serbest metin içine gömülü, TEK ve 4 haneli yıllı bir gg.aa.yyyy /
// gg/aa/yyyy / gg-aa-yyyy tarihi ("AÇILDI 06.04.2015" gibi) - gerçek
// kaynak veriyi kullanır, 2 haneli yıl (yüzyıl belirsizliği) veya birden
// fazla aday tarih varsa TAHMİN ETMEZ, null döner.
const TARIH_DESENI = /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\b/g;

function metinIcindenTekTarihCikar(s: string): Date | null {
  const eslesmeler = [...s.matchAll(TARIH_DESENI)];
  if (eslesmeler.length !== 1) return null;
  const [, gg, aa, yyyy] = eslesmeler[0];
  const d = new Date(Date.UTC(Number(yyyy), Number(aa) - 1, Number(gg)));
  return !isNaN(d.getTime()) && makulMu(d) ? d : null;
}

function tarihAyristir(v: unknown): Date | null {
  if (v instanceof Date) {
    return !isNaN(v.getTime()) && makulMu(v) ? v : null;
  }
  if (typeof v === "number") {
    const parcalar = XLSX.SSF?.parse_date_code?.(v);
    if (!parcalar) return null;
    const d = new Date(Date.UTC(parcalar.y, parcalar.m - 1, parcalar.d, parcalar.H ?? 0, parcalar.M ?? 0, parcalar.S ?? 0));
    return !isNaN(d.getTime()) && makulMu(d) ? d : null;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    return metinIcindenTekTarihCikar(s);
  }
  return null;
}

type SatirSonucu = {
  sayfa: string;
  satir: number;
};

type EklenenKayit = SatirSonucu & {
  id: string;
  musteri: string;
  karsiTaraf: string | null;
  konu: string;
  birimAdi: string | null;
  dosyaNo: string | null;
};

type HataliKayit = SatirSonucu & { sebep: string };
type ZatenVarKayit = SatirSonucu & { id: string };
type BelirsizDurumKayit = SatirSonucu & { ham: string | null };
type GecersizTarihKayit = SatirSonucu & { ham: string };

async function main() {
  const xlsxYolu = process.argv[2] ?? process.env.IMPORT_XLSX_PATH;
  if (!xlsxYolu) {
    console.error(
      'Kullanım: npm run import:dava-veritabani -- "/tam/yol/Dava Veritabani.xlsx"\n' +
        "(veya IMPORT_XLSX_PATH ortam değişkenini ayarlayın)",
    );
    process.exit(1);
  }
  if (!fs.existsSync(xlsxYolu)) {
    console.error(`Dosya bulunamadı: ${xlsxYolu}`);
    process.exit(1);
  }

  console.log(`Okunuyor: ${xlsxYolu}`);
  // cellDates:true -> tarih hücreleri otomatik JS Date olarak gelir.
  const workbook = XLSX.readFile(xlsxYolu, { cellDates: true });
  if (!workbook.SheetNames.includes(SAYFA_ADI)) {
    console.error(
      `"${SAYFA_ADI}" adlı çalışma sayfası bulunamadı. Mevcut sayfalar: ${workbook.SheetNames.join(", ")}`,
    );
    process.exit(1);
  }
  const sheet = workbook.Sheets[SAYFA_ADI];
  const satirlar: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const basliklarHam = (satirlar[0] ?? []).map((h) => (h == null ? "" : String(h).replace(/\s+/g, " ").trim()));
  BEKLENEN_BASLIKLAR.forEach((beklenen, i) => {
    if (basliklarHam[i] !== beklenen) {
      console.warn(
        `Uyarı: ${i + 1}. sütun başlığı beklenenden farklı ("${basliklarHam[i]}" != "${beklenen}"). ` +
          "Kaynak dosyanın yapısı değişmiş olabilir, sütun eşlemesini kontrol edin.",
      );
    }
  });

  // ---- Önden yükleme: mevcut seçenek değerleri, müvekkiller, karşı taraflar ----
  const davaDurumListesi = await prisma.secenekListesi.findUnique({
    where: { anahtar: "dava_dosyasi_durumu" },
    include: { degerler: true },
  });
  if (!davaDurumListesi) {
    console.error('"dava_dosyasi_durumu" seçenek listesi bulunamadı. Önce "npm run prisma:seed" çalıştırın.');
    process.exit(1);
  }
  const durumIdHaritasi = new Map(davaDurumListesi.degerler.map((d) => [d.kod, d.id]));
  for (const kod of ["acilacak", "derdest", "kapali", "incelenmeli"]) {
    if (!durumIdHaritasi.has(kod)) {
      console.error(`"dava_dosyasi_durumu" listesinde "${kod}" kodu yok. Önce "npm run prisma:seed" çalıştırın.`);
      process.exit(1);
    }
  }

  const musteriTipiListesi = await prisma.secenekListesi.findUnique({
    where: { anahtar: "musteri_tipi" },
    include: { degerler: true },
  });
  const musteriDurumuListesi = await prisma.secenekListesi.findUnique({
    where: { anahtar: "musteri_durumu" },
    include: { degerler: true },
  });
  const bilinmiyorTipId = musteriTipiListesi?.degerler.find((d) => d.kod === "bilinmiyor")?.id;
  const aktifMusteriDurumId = musteriDurumuListesi?.degerler.find((d) => d.kod === "aktif")?.id;
  if (!bilinmiyorTipId || !aktifMusteriDurumId) {
    console.error(
      '"musteri_tipi:bilinmiyor" veya "musteri_durumu:aktif" seçenek değeri bulunamadı. Önce "npm run prisma:seed" çalıştırın.',
    );
    process.exit(1);
  }

  const mevcutMusteriler = await prisma.musteri.findMany({ select: { id: true, adSoyadUnvan: true } });
  const musteriCache = new Map<string, string>();
  for (const m of mevcutMusteriler) musteriCache.set(normAd(m.adSoyadUnvan), m.id);
  const yeniMusteriler: { ad: string; id: string }[] = [];

  const mevcutKarsiTaraflar = await prisma.karsiTaraf.findMany({ select: { id: true, ad: true, musteriId: true } });
  const karsiTarafCache = new Map<string, string>(); // key: `${musteriId}::${normAd}`
  for (const kt of mevcutKarsiTaraflar) karsiTarafCache.set(`${kt.musteriId}::${normAd(kt.ad)}`, kt.id);
  const yeniKarsiTaraflar: { musteriId: string; ad: string; id: string }[] = [];

  async function musteriBulOlustur(adHam: string): Promise<string> {
    const norm = normAd(adHam);
    const varOlan = musteriCache.get(norm);
    if (varOlan) return varOlan;
    const yeni = await prisma.musteri.create({
      data: { adSoyadUnvan: adHam.trim(), tipId: bilinmiyorTipId!, durumId: aktifMusteriDurumId! },
    });
    musteriCache.set(norm, yeni.id);
    yeniMusteriler.push({ ad: adHam.trim(), id: yeni.id });
    return yeni.id;
  }

  async function karsiTarafBulOlustur(musteriId: string, adHam: string): Promise<string> {
    const norm = normAd(adHam);
    const anahtar = `${musteriId}::${norm}`;
    const varOlan = karsiTarafCache.get(anahtar);
    if (varOlan) return varOlan;
    const yeni = await prisma.karsiTaraf.create({ data: { musteriId, ad: adHam.trim() } });
    karsiTarafCache.set(anahtar, yeni.id);
    yeniKarsiTaraflar.push({ musteriId, ad: adHam.trim(), id: yeni.id });
    return yeni.id;
  }

  // ---- Ana döngü: satır satır işle ----
  const eklenenler: EklenenKayit[] = [];
  const zatenVarOlanlar: ZatenVarKayit[] = [];
  const hatalilar: HataliKayit[] = [];
  const belirsizDurumlar: BelirsizDurumKayit[] = [];
  const gecersizTarihler: GecersizTarihKayit[] = [];
  let bosSatirSayisi = 0;
  let toplamKaynakSatiri = 0;

  for (let i = 1; i < satirlar.length; i++) {
    const satirNo = i + 1; // Excel 1-tabanlı satır no (başlık 1. satır)
    const row = satirlar[i] ?? [];
    const bosMu = row.every((c) => c === null || c === undefined || (typeof c === "string" && c.trim() === ""));
    if (bosMu) {
      bosSatirSayisi++;
      continue;
    }
    toplamKaynakSatiri++;

    const anahtar = `dava-veritabani-xlsx:${SAYFA_ADI}:${satirNo}`;
    try {
      const musteriAdiHam = metinYaAlNull(row[SUTUN.muvekkil]);
      const konu = metinYaAlNull(row[SUTUN.davaKonusu]);
      const acilisTarihiHam = row[SUTUN.acilisTarihi];
      const acilisTarihi = tarihAyristir(acilisTarihiHam);

      const eksikler: string[] = [];
      if (!musteriAdiHam) eksikler.push("MÜVEKKİL alanı boş");
      if (!konu) eksikler.push("DAVA KONUSU alanı boş");
      if (!acilisTarihi) {
        const acilisHamMetin = metinYaAlNull(acilisTarihiHam);
        if (acilisHamMetin) {
          eksikler.push(`AÇILIŞ TARİHİ ayrıştırılamadı: "${acilisHamMetin}"`);
          gecersizTarihler.push({ sayfa: SAYFA_ADI, satir: satirNo, ham: acilisHamMetin });
        } else {
          eksikler.push("AÇILIŞ TARİHİ alanı boş");
        }
      }
      if (eksikler.length > 0) {
        hatalilar.push({ sayfa: SAYFA_ADI, satir: satirNo, sebep: eksikler.join("; ") });
        continue;
      }

      // Idempotent kontrol: bu satır daha önce aktarıldıysa DOKUNMA.
      const mevcutDosya = await prisma.davaDosyasi.findUnique({ where: { legacyKaynakAnahtari: anahtar } });
      if (mevcutDosya) {
        zatenVarOlanlar.push({ sayfa: SAYFA_ADI, satir: satirNo, id: mevcutDosya.id });
        continue;
      }

      const musteriId = await musteriBulOlustur(musteriAdiHam!);

      const karsiTarafAdiHam = metinYaAlNull(row[SUTUN.karsiTaraf]);
      const karsiTarafId = karsiTarafAdiHam ? await karsiTarafBulOlustur(musteriId, karsiTarafAdiHam) : null;

      const durumKoduHam = metinYaAlNull(row[SUTUN.durumKodu]);
      let durumKod = "incelenmeli";
      if (durumKoduHam) {
        const eslenen = DURUM_ESLEME[normUst(durumKoduHam)];
        if (eslenen) {
          durumKod = eslenen;
        } else {
          belirsizDurumlar.push({ sayfa: SAYFA_ADI, satir: satirNo, ham: durumKoduHam });
        }
      } else {
        belirsizDurumlar.push({ sayfa: SAYFA_ADI, satir: satirNo, ham: null });
      }
      const durumId = durumIdHaritasi.get(durumKod)!;

      const birimAdi = metinYaAlNull(row[SUTUN.birimAdi]);
      const dosyaNo = metinYaAlNull(row[SUTUN.dosyaNo]);
      const notlar = metinYaAlNull(row[SUTUN.notlar]);

      const legacyImportData = {
        kaynak: KAYNAK_ETIKETI,
        kaynakDosyaAdi: path.basename(xlsxYolu),
        kaynakSayfaAdi: SAYFA_ADI,
        kaynakSatirNo: satirNo,
        tur: metinYaAlNull(row[SUTUN.tur]),
        dosyaRumuz: metinYaAlNull(row[SUTUN.dosyaRumuz]),
        muvekkilKonumu: metinYaAlNull(row[SUTUN.muvekkilKonumu]),
        icraDosyasi: metinYaAlNull(row[SUTUN.icraDosyasi]),
        tehirIIcra: metinYaAlNull(row[SUTUN.tehirIIcra]),
        uyapKayitliVekil: metinYaAlNull(row[SUTUN.uyapKayitliVekil]),
        davaDetayi: metinYaAlNull(row[SUTUN.davaDetayi]),
        acanKisi: metinYaAlNull(row[SUTUN.acanKisi]),
        sorumlu: metinYaAlNull(row[SUTUN.sorumlu]),
        durumKoduHam,
        davaMasrafiHam: metinYaAlNull(row[SUTUN.davaMasrafi]),
        masrafMuvAlindiMiHam: metinYaAlNull(row[SUTUN.masrafMuvAlindiMi]),
        notlarKaynakHam: notlar,
      };

      const dosya = await prisma.davaDosyasi.create({
        data: {
          konu: konu!,
          birimAdi,
          dosyaNo,
          acilisTarihi: acilisTarihi!,
          aciklama: notlar,
          durumId,
          legacyKaynakAnahtari: anahtar,
          legacyImportData,
          muvekkiller: { create: [{ musteriId }] },
          ...(karsiTarafId ? { karsiTaraflar: { create: [{ karsiTarafId }] } } : {}),
        },
      });

      eklenenler.push({
        sayfa: SAYFA_ADI,
        satir: satirNo,
        id: dosya.id,
        musteri: musteriAdiHam!,
        karsiTaraf: karsiTarafAdiHam,
        konu: konu!,
        birimAdi,
        dosyaNo,
      });
    } catch (hata) {
      hatalilar.push({
        sayfa: SAYFA_ADI,
        satir: satirNo,
        sebep: hata instanceof Error ? hata.message : String(hata),
      });
    }
  }

  // ---- Sabit Ceza/CMK Dosyaları ----
  const cezaSonuc = await cezaDosyalariniIceAktar(musteriBulOlustur);

  // ---- Rapor ----
  console.log("\n================ İÇE AKTARIM RAPORU ================");
  console.log(`Kaynak dosya: ${xlsxYolu}`);
  console.log(`Sayfa: ${SAYFA_ADI}`);
  console.log(`Toplam satır (başlık hariç): ${satirlar.length - 1}`);
  console.log(`Boş satır (atlandı): ${bosSatirSayisi}`);
  console.log(`Boş olmayan kaynak satırı: ${toplamKaynakSatiri}`);
  console.log(`Yeni eklenen dava dosyası: ${eklenenler.length}`);
  console.log(`Zaten aktarılmış, dokunulmadı: ${zatenVarOlanlar.length}`);
  console.log(`Hatalı/atlanan satır: ${hatalilar.length}`);
  console.log(`Yeni oluşturulan müvekkil: ${yeniMusteriler.length}`);
  console.log(`Yeni oluşturulan karşı taraf: ${yeniKarsiTaraflar.length}`);
  console.log(`Belirsiz/eşlenemeyen durum kodu (inceleme gerekli): ${belirsizDurumlar.length}`);
  console.log(`Geçersiz açılış tarihi: ${gecersizTarihler.length}`);
  console.log(`\nCeza/CMK dosyaları -> yeni eklenen: ${cezaSonuc.eklenen.length}, zaten var: ${cezaSonuc.zatenVar.length}`);

  if (hatalilar.length > 0) {
    console.log("\n--- Hatalı/atlanan satırlar ---");
    for (const h of hatalilar) console.log(`  Satır ${h.satir}: ${h.sebep}`);
  }
  if (belirsizDurumlar.length > 0) {
    console.log("\n--- İnceleme gerekli (durum kodu belirsiz/boş) ---");
    for (const b of belirsizDurumlar) console.log(`  Satır ${b.satir}: kaynak durum = "${b.ham ?? "(boş)"}"`);
  }
  if (gecersizTarihler.length > 0) {
    console.log("\n--- Geçersiz açılış tarihi ---");
    for (const g of gecersizTarihler) console.log(`  Satır ${g.satir}: "${g.ham}"`);
  }
  if (yeniMusteriler.length > 0) {
    console.log("\n--- Yeni oluşturulan müvekkiller (tip: Bilinmiyor, kontrol edilmeli) ---");
    for (const m of yeniMusteriler) console.log(`  ${m.ad} (${m.id})`);
  }

  // Makine-okunur rapor dosyası (denetim/arşiv amaçlı).
  const raporYolu = path.join(process.cwd(), `import-raporu-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(
    raporYolu,
    JSON.stringify(
      {
        xlsxYolu,
        sayfa: SAYFA_ADI,
        toplamSatir: satirlar.length - 1,
        bosSatirSayisi,
        toplamKaynakSatiri,
        eklenenler,
        zatenVarOlanlar,
        hatalilar,
        belirsizDurumlar,
        gecersizTarihler,
        yeniMusteriler,
        yeniKarsiTaraflar,
        ceza: cezaSonuc,
      },
      null,
      2,
    ),
    "utf-8",
  );
  console.log(`\nAyrıntılı rapor: ${raporYolu}`);
  console.log("================ RAPOR SONU ================\n");
}

// ============================================================
// Sabit Ceza/CMK Dosyaları (görev tanımında verilen iki kayıt) - Hukuk
// Dosyaları alanına DEĞİL, Ceza/CMK Dosyaları alanına aktarılır.
// ============================================================

type CezaKaydi = {
  dosyaRumuzu: string;
  musteri: string | null;
  karsiTaraf: string | null;
  birimAdi: string | null;
  dosyaNo: string | null;
  sifatimiz: string | null;
  sucTuru: string;
  akibeti: string | null;
  dosyaDurumu: string;
  durusmaTarihi: string | null;
  sorumlu: string | null;
};

const cezaDosyalari: CezaKaydi[] = [
  {
    dosyaRumuzu: "TAYLAN KARAMAN HAKSIZ REKABET",
    musteri: "BAEV GIDA",
    karsiTaraf: "TAYLAN KARAMAN",
    birimAdi: "İstanbul Anadolu 41. Asliye Ceza Mahkemesi",
    dosyaNo: "2026/585",
    sifatimiz: "MÜŞTEKİ",
    sucTuru: "HAKSIZ REKABET",
    akibeti: null,
    dosyaDurumu: "DERDEST",
    durusmaTarihi: null,
    sorumlu: "BORA",
  },
  {
    dosyaRumuzu: "GİRAY ÇENÇ ARAÇ DAVASI",
    musteri: null,
    karsiTaraf: null,
    birimAdi: null,
    dosyaNo: null,
    sifatimiz: null,
    sucTuru: "DOLANDIRICILIK + RBG",
    akibeti: "MAHKUMİYET",
    dosyaDurumu: "İSTİNAFTA",
    durusmaTarihi: null,
    sorumlu: "BORA",
  },
];

// CMKDosyaDurumu enum'unun geçerli değerleri (bkz. schema.prisma) - kaynak
// metin bunlardan biriyle birebir eşleşmezse ("İSTİNAFTA" gibi) ana durum
// TAHMİN EDİLMEZ; sade model gereği "DERDEST"e düşer ve orijinal metin
// orijinalDurum alanında saklanır (görev tanımındaki açık talimat).
const GECERLI_CMK_DURUMLARI: CMKDosyaDurumu[] = [
  "AKTIF",
  "DURUSMASI_BEKLENIYOR",
  "ISTINAF_BASVURUSU",
  "TEMYIZ",
  "DERDEST",
  "KARAR_VERILDI",
  "KESINLESTI",
  "KAPANDI",
];

async function cezaDosyalariniIceAktar(musteriBulOlustur: (ad: string) => Promise<string>) {
  const eklenen: { dosyaRumuzu: string; id: string }[] = [];
  const zatenVar: { dosyaRumuzu: string; id: string }[] = [];

  for (const kayit of cezaDosyalari) {
    const anahtar = `ceza-dosyalari-sabit:${kayit.dosyaRumuzu}`;
    const mevcut = await prisma.cMKDosyasi.findUnique({ where: { legacyKaynakAnahtari: anahtar } });
    if (mevcut) {
      zatenVar.push({ dosyaRumuzu: kayit.dosyaRumuzu, id: mevcut.id });
      continue;
    }

    let musteriId: string | null = null;
    let adSoyad = kayit.dosyaRumuzu; // güvenli varsayılan: müvekkil yoksa, TAHMİN ETMEDEN tek gerçek kimlik bilgisi
    if (kayit.musteri) {
      musteriId = await musteriBulOlustur(kayit.musteri);
      const musteriKaydi = await prisma.musteri.findUnique({ where: { id: musteriId }, select: { adSoyadUnvan: true } });
      if (musteriKaydi) adSoyad = musteriKaydi.adSoyadUnvan;
    }

    let dosyaDurumu: CMKDosyaDurumu;
    let orijinalDurum: string | null = null;
    if (GECERLI_CMK_DURUMLARI.includes(kayit.dosyaDurumu as CMKDosyaDurumu)) {
      dosyaDurumu = kayit.dosyaDurumu as CMKDosyaDurumu;
    } else {
      dosyaDurumu = "DERDEST";
      orijinalDurum = kayit.dosyaDurumu;
    }

    const yeni = await prisma.cMKDosyasi.create({
      data: {
        musteriId,
        adSoyad,
        suc: kayit.sucTuru,
        birim: kayit.birimAdi,
        dosyaNo: kayit.dosyaNo,
        dosyaDurumu,
        orijinalDurum,
        hukum: kayit.akibeti,
        dosyaRumuzu: kayit.dosyaRumuzu,
        karsiTaraf: kayit.karsiTaraf,
        sifatimiz: kayit.sifatimiz,
        durusmaTarihi: kayit.durusmaTarihi ? new Date(kayit.durusmaTarihi) : null,
        legacyKaynakAnahtari: anahtar,
        legacyImportData: {
          kaynak: "KOKPİT görev tanımı - sabit Ceza/CMK dosyaları listesi",
          sorumlu: kayit.sorumlu,
        },
      },
    });
    eklenen.push({ dosyaRumuzu: kayit.dosyaRumuzu, id: yeni.id });
  }

  return { eklenen, zatenVar };
}

main()
  .catch((hata) => {
    console.error("İçe aktarım beklenmeyen bir hatayla durdu:", hata);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
