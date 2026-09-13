import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Genisletilebilir secenek listeleri ve baslangic degerleri.
// Yeni bir deger eklemek icin bu diziye satir eklemek yeterli; sema degismez.
const SECENEK_LISTELERI: {
  anahtar: string;
  ad: string;
  degerler: { kod: string; etiket: string; aktifMi?: boolean }[];
}[] = [
  {
    anahtar: "musteri_tipi",
    ad: "Müşteri Tipi",
    degerler: [
      { kod: "gercek_kisi", etiket: "Gerçek Kişi" },
      { kod: "tuzel_kisi", etiket: "Tüzel Kişi" },
    ],
  },
  {
    anahtar: "musteri_durumu",
    ad: "Müşteri Durumu",
    degerler: [
      { kod: "aktif", etiket: "Aktif" },
      { kod: "pasif", etiket: "Pasif" },
      { kod: "potansiyel", etiket: "Potansiyel" },
    ],
  },
  {
    anahtar: "para_trafigi_tipi",
    ad: "Para Trafiği Tipi",
    degerler: [
      // Müvekkilden gelen paranın tasnifteki baskın türünü doğrudan ifade
      // eder (bkz. ARCHITECTURE.md). Tek bir cari koda gidiyorsa o tip
      // seçilir ve tasnif otomatik/tek kalemli yapılır; birden fazla cari
      // koda bölünüyorsa "Karma" seçilip tasnif alanları elle doldurulur.
      { kod: "masraf", etiket: "Masraf" },
      { kod: "bloke_para", etiket: "Bloke Para" },
      { kod: "akdi_vekalet", etiket: "Akdi Vekalet" },
      { kod: "aktarilacak_para", etiket: "Emanet Para" },
      { kod: "karma", etiket: "Karma" },
      // Eski degerler: gecmis kayitlarin bozulmamasi icin silinmiyor,
      // sadece yeni giriste secilemesin diye pasife alindi.
      { kod: "tahsilat", etiket: "Tahsilat (eski)", aktifMi: false },
      { kod: "borc", etiket: "Borç (eski)", aktifMi: false },
      { kod: "masraf_yansitma", etiket: "Masraf Yansıtma (eski)", aktifMi: false },
    ],
  },
  {
    anahtar: "para_trafigi_durumu",
    ad: "Para Trafiği Durumu",
    degerler: [
      { kod: "beklemede", etiket: "Beklemede" },
      { kod: "tahsil_edildi", etiket: "Tahsil Edildi" },
      { kod: "iptal", etiket: "İptal" },
    ],
  },
  {
    anahtar: "kaynak",
    ad: "Kayıt Kaynağı",
    degerler: [
      { kod: "manuel", etiket: "Manuel" },
      { kod: "uyap_import", etiket: "UYAP Aktarım" },
      { kod: "objekt", etiket: "Objekt" },
    ],
  },
  {
    anahtar: "dava_dosyasi_durumu",
    ad: "Dava Dosyası Durumu",
    degerler: [
      { kod: "acik", etiket: "Açık" },
      { kod: "kapali", etiket: "Kapalı" },
      { kod: "arsiv", etiket: "Arşiv" },
    ],
  },
  {
    anahtar: "dosya_turu",
    ad: "Dosya Türü",
    degerler: [
      // Dava/icra oncesi asamalar - resmi bir dosya/takip acilmadan once
      // atilan adimlar (ör. sadece borcluyla pazarlik edildi, baska bir
      // sey yapilmadi).
      { kod: "ihtar_dosyasi", etiket: "İhtar Dosyası" },
      { kod: "arabuluculuk_dosyasi", etiket: "Arabuluculuk Dosyası" },
      { kod: "muzakere_dosyasi", etiket: "Müzakere Dosyası" },
      // Resmi icra/dava dosyalari.
      { kod: "esas_icra_dosyasi", etiket: "Esas İcra Dosyası" },
      // Talimat dosyasi esas icranin alt turudur (bkz. bagliOlduguDosyaId).
      { kod: "talimat_dosyasi", etiket: "Talimat Dosyası" },
      { kod: "ihtiyati_haciz_dosyasi", etiket: "İhtiyati Haciz Dosyası" },
      { kod: "icra_ceza_davasi", etiket: "İcra Ceza Davası" },
      { kod: "dava_dosyasi", etiket: "Dava Dosyası (Hukuk/Ceza)" },
    ],
  },
  {
    anahtar: "hukuki_iliski_turu",
    ad: "Hukuki İlişki Türü",
    degerler: [
      // Dosya Turu'nden farkli bir boyut: "hangi ASAMADAYIZ" (ihtar/icra/
      // dava) degil, "hangi hukuki ARACA/iliskiye dayaniyor" sorusuna
      // cevap verir. Opsiyonel - her dosyaya uygulanmayabilir.
      { kod: "cek", etiket: "Çek" },
      { kod: "senet", etiket: "Senet" },
      { kod: "ttok", etiket: "TTOK" },
      { kod: "is_hukuku_uyusmazligi", etiket: "İş Hukuku Uyuşmazlığı" },
      { kod: "sozlesme_uyusmazligi", etiket: "Sözleşme Uyuşmazlığı" },
      { kod: "diger", etiket: "Diğer" },
    ],
  },
  {
    anahtar: "cari_kod",
    ad: "Cari Kod",
    degerler: [
      { kod: "bloke_paralar", etiket: "Bloke Paralar" },
      { kod: "masraf_hesabi", etiket: "Masraf Hesabı" },
      { kod: "akdi_vekalet_hesabi", etiket: "Akdi Vekalet Hesabı" },
      { kod: "ticari_hesap", etiket: "Ticari Hesap" },
      { kod: "emanet_hesabi", etiket: "Emanet Hesabı" },
    ],
  },
  {
    anahtar: "masraf_turu",
    ad: "Masraf Türü",
    degerler: [
      { kod: "basvuru_harci", etiket: "Başvuru Harcı" },
      { kod: "vekaletname_harci", etiket: "Vekaletname Harcı" },
      { kod: "baro_pulu", etiket: "Baro Pulu" },
      { kod: "pesin_harc", etiket: "Peşin Harç" },
      { kod: "pul", etiket: "Pul" },
      { kod: "dava_masrafi", etiket: "Dava Masrafı" },
      { kod: "haciz_avansi", etiket: "Haciz Avansı" },
      { kod: "tevkil_masrafi", etiket: "Tevkil Masrafı" },
      { kod: "diger", etiket: "Diğer" },
    ],
  },
];

async function secenekListeleriniOlustur() {
  for (const liste of SECENEK_LISTELERI) {
    const olusturulanListe = await prisma.secenekListesi.upsert({
      where: { anahtar: liste.anahtar },
      update: { ad: liste.ad },
      create: { anahtar: liste.anahtar, ad: liste.ad },
    });

    for (const [index, deger] of liste.degerler.entries()) {
      // DIKKAT: "update" burada BILEREK bos birakildi. Bu script "npm run
      // build" ile HER deploy'da calisir (bkz. package.json); eger burada
      // etiket/siraNo/aktifMi guncellenseydi, Ayarlar > Secenek Listeleri
      // panelinden yapilan HER admin duzenlemesi bir sonraki deploy'da
      // sessizce sifirlanirdi. Bu yuzden seed sadece EKSIK olan degerleri
      // olusturur; var olan bir satirin gorunur alanlarina bir daha asla
      // dokunmaz - o noktadan sonra tek yetkili kaynak admin panelidir.
      // Var olan bir degeri kasitli olarak degistirmek gerekiyorsa (ornek:
      // "Aktarilacak Para (Emanet)" -> "Emanet Para" degisikligi) bunun
      // icin ayri, tek seferlik bir veri migrasyonu yazilir (bkz.
      // prisma/migrations/20260913170000_emanet_para_rename).
      await prisma.secenekDegeri.upsert({
        where: { listeId_kod: { listeId: olusturulanListe.id, kod: deger.kod } },
        update: {},
        create: {
          listeId: olusturulanListe.id,
          kod: deger.kod,
          etiket: deger.etiket,
          siraNo: index,
          aktifMi: deger.aktifMi ?? true,
        },
      });
    }
  }
  console.log(`✓ ${SECENEK_LISTELERI.length} seçenek listesi hazırlandı.`);
}

async function baslangicKullanicisiniOlustur() {
  const eposta = process.env.SEED_ADMIN_EPOSTA ?? "admin@eceshukuk.com";
  const sifre = process.env.SEED_ADMIN_SIFRE ?? "Degistir123!";

  const mevcut = await prisma.kullanici.findUnique({ where: { eposta } });
  if (mevcut) {
    console.log(`✓ Yönetici kullanıcı zaten mevcut: ${eposta}`);
    return;
  }

  const sifreHash = await bcrypt.hash(sifre, 12);
  await prisma.kullanici.create({
    data: {
      adSoyad: "Sistem Yöneticisi",
      eposta,
      sifreHash,
      rol: "YONETICI",
    },
  });
  console.log(`✓ Yönetici kullanıcı oluşturuldu: ${eposta} / ${sifre}`);
  console.log("  ÖNEMLİ: İlk girişten sonra bu şifreyi değiştirin.");
}

async function main() {
  await secenekListeleriniOlustur();
  await baslangicKullanicisiniOlustur();
}

main()
  .catch((hata) => {
    console.error(hata);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
