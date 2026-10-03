// Excel'den masraf aktarimi icin saf (veritabanindan bagimsiz) tasnif motoru.
// Bir satirin Tür / Grup / Kalem / Cari Kod'unu Excel'deki metinlerden TAHMIN
// eder ve her tahminin NEDENINI listeler - kullanici onay ekraninda "neye
// gore bu secildi" sorusunun cevabini gorur (bkz. masraf-excel-aktar.tsx).
// Gercek kayit her zaman kullanici onayindan sonra yapilir.

export function normalize(metin: string | null | undefined): string {
  return (metin ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9/]+/g, " ")
    .trim();
}

export type HamSatir = {
  satirNo: number; // Excel'deki satir numarasi
  tarih: string | null; // YYYY-MM-DD
  excelTur: string;
  excelCariKod: string;
  aciklama: string;
  digerMetinler: string[]; // basligi taninmayan sutunlardaki metinler (ipucu)
  tutar: number | null;
};

export type Tahmin = {
  turKodu: string | null;
  grupKodu: string | null;
  kalemKodu: string | null;
  cariKodKodu: string | null;
  nedenler: string[];
  // yuksek: tur + grup + cari kod Excel'deki acik ifadelerden cikarildi;
  // dusuk: en az biri varsayim/belirsiz - kullanicinin mutlaka bakmasi gerek.
  guven: "yuksek" | "dusuk";
};

const TUR_ESLEMELERI: [RegExp, string][] = [
  [/basvuru harc/, "basvuru_harci"],
  [/vekaletname harc/, "vekaletname_harci"],
  [/baro pulu/, "baro_pulu"],
  [/pesin harc/, "pesin_harc"],
  [/^pul$|posta pulu|\bpul\b/, "pul"],
  [/dava masraf/, "dava_masrafi"],
  [/haciz avans/, "haciz_avansi"],
  [/tevkil/, "tevkil_masrafi"],
  [/^diger$/, "diger"],
];

const ACILIS_TURLERI = ["basvuru_harci", "vekaletname_harci", "baro_pulu", "pesin_harc"];

export function satiriTahminEt(satir: HamSatir): Tahmin {
  const nedenler: string[] = [];
  const turMetni = normalize(satir.excelTur);
  const hepsi = normalize([satir.excelTur, satir.excelCariKod, satir.aciklama, ...satir.digerMetinler].join(" "));
  const grupMetni = normalize([satir.excelCariKod, ...satir.digerMetinler].join(" "));

  // --- Tür (masraf türü)
  let turKodu: string | null = null;
  for (const [desen, kod] of TUR_ESLEMELERI) {
    if (desen.test(turMetni)) {
      turKodu = kod;
      nedenler.push(`Excel'de Türü "${satir.excelTur}" yazıyor.`);
      break;
    }
  }

  // --- Grup (zamana göre)
  let grupKodu: string | null = null;
  const grupIpucuMetni = `${grupMetni} ${normalize(satir.aciklama)}`;
  if (/hazirlik/.test(grupMetni)) {
    grupKodu = "hazirlik";
    nedenler.push('Excel metninde "hazırlık" geçiyor → Hazırlık Masrafları.');
  } else if (/dosya acilis/.test(grupMetni)) {
    grupKodu = "dosya_acilis";
    nedenler.push('Excel metninde "dosya açılış masrafı" geçiyor → Dosya Açılış Masrafları.');
  } else if (/bloke|yakalama|yediemin|satis avans/.test(grupIpucuMetni)) {
    grupKodu = "bloke_tip";
    nedenler.push("Bloke/yakalama/yediemin/satış avansı ifadesi geçiyor → Bloke Tip Masraflar.");
  } else if (/islem masraf/.test(grupMetni)) {
    grupKodu = "dosya_islem";
    nedenler.push('Excel metninde "işlem masrafı" geçiyor → Dosya İşlem Masrafları.');
  } else if (/tahsil harc/.test(hepsi)) {
    grupKodu = "tahsil_harci";
    nedenler.push('"Tahsil harcı" geçiyor → Tahsil Harcı.');
  } else if (/cezaevi/.test(hepsi)) {
    grupKodu = "cezaevi_harci";
    nedenler.push('"Cezaevi" geçiyor → Cezaevi Harcı.');
  } else if (turKodu && ACILIS_TURLERI.includes(turKodu)) {
    grupKodu = "dosya_acilis";
    nedenler.push(`"${satir.excelTur}" tipik bir dosya açılış masrafıdır (varsayım).`);
  }

  // --- Kalem (ince ayrim)
  let kalemKodu: string | null = null;
  const a = normalize(satir.aciklama);
  if (/yakalama/.test(hepsi)) kalemKodu = "yakalama_avansi";
  else if (/satis/.test(hepsi) && /avans/.test(hepsi)) kalemKodu = "satis_avansi";
  else if (/yediemin/.test(hepsi)) kalemKodu = "pesin_yediemin_ucreti";
  else if (/maas/.test(a) && /haciz/.test(a)) kalemKodu = "maas_haciz_muzekkeresi";
  else if (/fiili haciz/.test(a)) kalemKodu = "fiili_haciz";
  else if (/89\/1/.test(a) && /banka/.test(a)) kalemKodu = "haciz_89_1_banka";
  else if (/89\/1/.test(a) && /kurum/.test(a)) kalemKodu = "haciz_89_1_diger_kurum";
  else if (/bila/.test(a) && /tebligat/.test(a)) kalemKodu = "bila_sebebiyle_tebligat";
  else if (/ilk/.test(a) && /tebligat/.test(a)) kalemKodu = "ilk_tebligat";
  if (kalemKodu) nedenler.push("Açıklamadaki ifadeye göre kalem tahmin edildi.");

  // --- Cari kod
  let cariKodKodu: string | null = null;
  if (/bloke/.test(hepsi) || grupKodu === "bloke_tip") {
    cariKodKodu = "bloke_paralar";
    nedenler.push("Bloke ifadesi/grubu → Bloke Paralar cari kodu.");
  } else if (grupKodu === "tahsil_harci" || grupKodu === "cezaevi_harci") {
    cariKodKodu = "harc_hesabi";
    nedenler.push("Harç grubu → Harç Hesabı cari kodu.");
  } else if (/akdi/.test(hepsi)) {
    cariKodKodu = "akdi_vekalet_hesabi";
  } else if (/karsi vekalet/.test(hepsi)) {
    cariKodKodu = "karsi_vekalet";
  } else if (/masraf hesabi/.test(hepsi) || grupKodu) {
    cariKodKodu = "masraf_hesabi";
    nedenler.push("Masraf grubuna dahil → Masraf Hesabı cari kodu.");
  }

  const guven: Tahmin["guven"] = turKodu && grupKodu && cariKodKodu ? "yuksek" : "dusuk";
  if (!turKodu) nedenler.push(`Türü "${satir.excelTur || "(boş)"}" tanınamadı - lütfen seçin.`);
  if (!grupKodu) nedenler.push("Hangi masraf grubuna girdiği Excel'den anlaşılamadı - lütfen seçin.");
  if (!cariKodKodu) nedenler.push("Cari kod belirlenemedi - lütfen seçin.");

  return { turKodu, grupKodu, kalemKodu, cariKodKodu, nedenler, guven };
}

// Ogrenilmis kural anahtari: ayni Excel "Tur" + "Cari Kod" metinleri tekrar
// geldiginde onceki onayli karar kullanilir.
export function kuralAnahtari(satir: Pick<HamSatir, "excelTur" | "excelCariKod" | "digerMetinler">): string {
  return `${normalize(satir.excelTur)}|${normalize([satir.excelCariKod, ...satir.digerMetinler].join(" "))}`;
}
