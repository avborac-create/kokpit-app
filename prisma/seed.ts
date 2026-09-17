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
      // (Etiketler bir kez, ayrı bir data-migration ile "Masraf Yaptık" vb.
      // şeklinde güncellendi - bkz. 20260914140000_para_kaydi_turleri
      // migration'ı; seed burada asla mevcut bir etikete dokunmaz.)
      { kod: "muvekkilden_para_geldi", etiket: "Müvekkilden Para Geldi" },
      { kod: "masraf", etiket: "Masraf Yaptık" },
      { kod: "bloke_para", etiket: "Bloke Para Yatırdık" },
      { kod: "bloke_para_iade", etiket: "Bloke Para Geri Geldi" },
      { kod: "akdi_vekalet", etiket: "Vekâlet Ücreti Ekledik" },
      { kod: "musteriye_odeme", etiket: "Müvekkile Para Gönderdik" },
      { kod: "avans_talebi", etiket: "Avans İstedik" },
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
    anahtar: "para_kaydi_sahibi",
    ad: "Para Kaydı Sahibi",
    degerler: [
      { kod: "muvekkil", etiket: "Müvekkil" },
      { kod: "buro", etiket: "Büro" },
    ],
  },
  {
    anahtar: "para_kaydi_kullanim_amaci",
    ad: "Para Kaydı Kullanım Amacı",
    degerler: [
      // "Muvekkilden Para Geldi" kaydinin dagitim satirlarinda kullanilir
      // (bkz. ParaTrafigiDagitimi) - her satir bir cari koda eslenir:
      // gecmis_masraf/dosya_avansi -> masraf_hesabi, vekalet_ucreti_odeme
      // -> akdi_vekalet_hesabi (bkz. cariHesapOzetiHesapla).
      { kod: "gecmis_masraf", etiket: "Geçmiş Masrafları Kapatma" },
      { kod: "vekalet_ucreti_odeme", etiket: "Vekâlet Ücreti Ödeme" },
      { kod: "dosya_avansi", etiket: "Dosya Avansı" },
    ],
  },
  {
    anahtar: "masraf_durumu",
    ad: "Masraf Durumu",
    degerler: [
      { kod: "odendi", etiket: "Ödendi" },
      { kod: "iptal_edildi", etiket: "İptal Edildi" },
    ],
  },
  {
    anahtar: "avans_durumu",
    ad: "Avans Durumu",
    degerler: [
      { kod: "istendi", etiket: "İstendi" },
      { kod: "kismen_geldi", etiket: "Kısmen Geldi" },
      { kod: "geldi", etiket: "Geldi" },
    ],
  },
  {
    anahtar: "vekalet_ucreti_durumu",
    ad: "Vekâlet Ücreti Durumu",
    degerler: [
      { kod: "odenmedi", etiket: "Ödenmedi" },
      { kod: "kismen_odendi", etiket: "Kısmen Ödendi" },
      { kod: "odendi", etiket: "Ödendi" },
    ],
  },
  {
    anahtar: "bloke_para_durumu",
    ad: "Bloke Para Durumu",
    degerler: [
      { kod: "blokede", etiket: "Blokede" },
      { kod: "kismen_iade", etiket: "Kısmen İade" },
      { kod: "iade_edildi", etiket: "İade Edildi" },
      { kod: "masrafa_donustu", etiket: "Masrafa Dönüştü" },
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
  {
    anahtar: "gelistirme_talebi_durumu",
    ad: "Geliştirme Talebi Durumu",
    degerler: [
      { kod: "beklemede", etiket: "Beklemede" },
      { kod: "yapiliyor", etiket: "Yapılıyor" },
      { kod: "tamamlandi", etiket: "Tamamlandı" },
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

// Claude'un sohbet sirasinda GELISTIRME_KUTUSU.md'ye ekledigi maddelerin
// otomatik olarak Kanban panosunda kart olarak belirmesi icin kullanilir.
// Her satirin sabit bir "anahtar"i vardir; bu sayede HER deploy'da tekrar
// calisan bu fonksiyon zaten var olan bir karta bir daha asla dokunmaz
// (kullanicinin panoda surukleyerek degistirdigi durum boylece hicbir
// zaman sifirlanmaz) - sadece eksik olan yeni maddeleri ekler. Yeni bir
// madde eklemek icin bu diziye satir eklemek yeterli.
const GELISTIRME_TALEPLERI: { anahtar: string; metin: string }[] = [
  {
    anahtar: "sutun-sirasi",
    metin:
      "Dosyalar tablosundaki sütunların admin tarafından manuel olarak yeniden sıralanabilmesi (dinamik sütun sırası).",
  },
  {
    anahtar: "dosya-listesi-duzenle-sil",
    metin:
      "Dosyalar listesinden/detayından kayıtları manuel düzenleme ve silme imkanı (not: Düzenle/Sil dosyanın kendi detay sayfasında zaten var, listeden erişim netleştirilmeli).",
  },
];

async function gelistirmeKutusunuSenkronizeEt() {
  const sahipEposta = process.env.SEED_ADMIN_EPOSTA ?? "admin@eceshukuk.com";
  const sahip = await prisma.kullanici.findUnique({ where: { eposta: sahipEposta } });
  const durumListesi = await prisma.secenekListesi.findUnique({
    where: { anahtar: "gelistirme_talebi_durumu" },
    include: { degerler: true },
  });
  const beklemedeId = durumListesi?.degerler.find((d) => d.kod === "beklemede")?.id;

  if (!sahip || !beklemedeId) {
    console.log("… Geliştirme Kutusu senkronizasyonu atlandı (kullanıcı/durum bulunamadı).");
    return;
  }

  let eklenen = 0;
  for (const talep of GELISTIRME_TALEPLERI) {
    const mevcut = await prisma.gelistirmeTalebi.findUnique({ where: { anahtar: talep.anahtar } });
    if (mevcut) continue;

    await prisma.gelistirmeTalebi.create({
      data: {
        anahtar: talep.anahtar,
        metin: talep.metin,
        durumId: beklemedeId,
        kullaniciId: sahip.id,
      },
    });
    eklenen += 1;
  }
  console.log(`✓ Geliştirme Kutusu: ${eklenen} yeni kart eklendi.`);
}

// GECMIS BIR HATANIN DUZELTMESI: "Yeni Karşı Taraf Ekle" / "Yeni Uyuşmazlık
// Grubu Ekle" alanlarina yazilan bir isim, ayni isimde bir kayit zaten var
// olsa bile HER ZAMAN yeni bir kayit olusturuyordu (bkz. actions.ts'teki
// duzeltme). Bu, mevcut veride yinelenen kayitlar birakti (orn. "Mata
// Kauçuk" iki ayri satir olarak). Asagidaki iki fonksiyon HER deploy'da
// calisip bu tur yinelenenleri sessizce birlestirir (en eski kayit kalir,
// baglantilar ona tasinir, digerleri silinir) - duzeltmeden sonra artik
// yinelenen kalmayacagi icin bir sonraki calismada hicbir sey yapmazlar,
// bu yuzden kalici olarak burada birakilmalari zararsizdir.
async function yinelenenKarsiTaraflariBirlestir() {
  const tumKarsiTaraflar = await prisma.karsiTaraf.findMany({ orderBy: { olusturmaTarihi: "asc" } });
  const gruplar = new Map<string, typeof tumKarsiTaraflar>();
  for (const kt of tumKarsiTaraflar) {
    const anahtar = `${kt.musteriId}::${kt.ad.trim().toLowerCase()}`;
    gruplar.set(anahtar, [...(gruplar.get(anahtar) ?? []), kt]);
  }

  let birlestirilen = 0;
  for (const liste of gruplar.values()) {
    if (liste.length < 2) continue;
    const [kanonik, ...yinelenenler] = liste;
    for (const yinelenen of yinelenenler) {
      const baglantilar = await prisma.dosyaKarsiTarafi.findMany({ where: { karsiTarafId: yinelenen.id } });
      for (const baglanti of baglantilar) {
        const zatenVar = await prisma.dosyaKarsiTarafi.findFirst({
          where: { dosyaId: baglanti.dosyaId, karsiTarafId: kanonik.id },
        });
        if (zatenVar) {
          await prisma.dosyaKarsiTarafi.delete({ where: { id: baglanti.id } });
        } else {
          await prisma.dosyaKarsiTarafi.update({
            where: { id: baglanti.id },
            data: { karsiTarafId: kanonik.id },
          });
        }
      }
      await prisma.karsiTaraf.delete({ where: { id: yinelenen.id } });
      birlestirilen += 1;
    }
  }
  if (birlestirilen > 0) {
    console.log(`✓ ${birlestirilen} yinelenen karşı taraf kaydı birleştirildi.`);
  }
}

async function yinelenenUyusmazlikGruplariniBirlestir() {
  const tumGruplar = await prisma.uyusmazlikGrubu.findMany({ orderBy: { olusturmaTarihi: "asc" } });
  const gruplar = new Map<string, typeof tumGruplar>();
  for (const g of tumGruplar) {
    const anahtar = `${g.musteriId}::${g.ad.trim().toLowerCase()}`;
    gruplar.set(anahtar, [...(gruplar.get(anahtar) ?? []), g]);
  }

  let birlestirilen = 0;
  for (const liste of gruplar.values()) {
    if (liste.length < 2) continue;
    const [kanonik, ...yinelenenler] = liste;
    for (const yinelenen of yinelenenler) {
      await prisma.davaDosyasi.updateMany({
        where: { uyusmazlikGrubuId: yinelenen.id },
        data: { uyusmazlikGrubuId: kanonik.id },
      });
      await prisma.musteriParaTrafigi.updateMany({
        where: { uyusmazlikGrubuId: yinelenen.id },
        data: { uyusmazlikGrubuId: kanonik.id },
      });
      await prisma.uyusmazlikGrubu.delete({ where: { id: yinelenen.id } });
      birlestirilen += 1;
    }
  }
  if (birlestirilen > 0) {
    console.log(`✓ ${birlestirilen} yinelenen uyuşmazlık grubu kaydı birleştirildi.`);
  }
}

// Sol menudeki modullerin varsayilan sirasi (bkz.
// src/core/modul-kayit-defteri.ts - anahtarlar oradakiyle birebir
// eslesmeli). Sadece ILK kez eksik olan bir modul icin baslangic siraNo'su
// belirlemek icin kullanilir; admin panodan (Ayarlar > Menü Düzeni)
// yaptigi surukle-birak/gizleme degisikligine bu liste bir daha asla
// dokunmaz.
const VARSAYILAN_MENU_SIRASI = [
  "ana-sayfa",
  "musteriler",
  "dava-dosyalari",
  "muvekkil-finans",
  "cmk-dosyalari",
  "oneriler",
  "ayarlar",
];

async function menuOgeleriniOlustur() {
  let eklenen = 0;
  for (const [index, anahtar] of VARSAYILAN_MENU_SIRASI.entries()) {
    const mevcut = await prisma.menuOgesi.findUnique({ where: { anahtar } });
    if (mevcut) continue;
    await prisma.menuOgesi.create({ data: { anahtar, siraNo: index } });
    eklenen += 1;
  }
  if (eklenen > 0) {
    console.log(`✓ Menü Düzeni: ${eklenen} yeni modül eklendi.`);
  }
}

// Dava Dosyasi formundaki, admin'in surukleyerek sirasini degistirebildigi
// alanlarin varsayilan sirasi (bkz. dava-dosyasi-formu.tsx). Muvekkil ve
// Karsi Taraf seciciler burada YOK - onlar sabit/kilitli, FormAlanDuzeni
// tablosuna hic girmiyor (bkz. ARCHITECTURE.md).
const VARSAYILAN_DAVA_DOSYASI_ALAN_SIRASI = [
  "hukukiIliskiTuruId",
  "turId",
  "dosyaNo",
  "konu",
  "durumId",
  "birimAdi",
  "uyusmazlikGrubuId",
  "bagliOlduguDosyaId",
  "acilisTarihi",
  "kapanisTarihi",
  "sorumluAvukatId",
  "aciklama",
];

async function formAlanDuzeniOlustur() {
  let eklenen = 0;
  for (const [index, alanAnahtari] of VARSAYILAN_DAVA_DOSYASI_ALAN_SIRASI.entries()) {
    const mevcut = await prisma.formAlanDuzeni.findUnique({
      where: { formAnahtari_alanAnahtari: { formAnahtari: "dava-dosyasi", alanAnahtari } },
    });
    if (mevcut) continue;
    await prisma.formAlanDuzeni.create({
      data: { formAnahtari: "dava-dosyasi", alanAnahtari, siraNo: index },
    });
    eklenen += 1;
  }
  if (eklenen > 0) {
    console.log(`✓ Form Düzeni: ${eklenen} yeni alan eklendi.`);
  }
}

// "Dosya Kumesi" zorunlu hale getirilmeden once, kumesiz kalmis TUM eski
// dosyalar icin otomatik birer TEKIL kume olusturur (dosyanin konusuyla
// adlandirilir, dosyanin ilk muvekkiline baglanir). Hicbir DavaDosyasi
// satiri silinmez/degistirilmez - sadece bos alan doldurulur. Idempotent:
// uyusmazlikGrubuId dolu bir dosyaya bir daha asla dokunmaz, ikinci
// calistirmada hicbir sey yapmaz.
async function kumesizDosyalariBackfillEt() {
  const kumesizler = await prisma.davaDosyasi.findMany({
    where: { uyusmazlikGrubuId: null },
    include: { muvekkiller: { orderBy: { olusturmaTarihi: "asc" }, take: 1 } },
  });

  let baglanan = 0;
  for (const dosya of kumesizler) {
    const ilkMuvekkilId = dosya.muvekkiller[0]?.musteriId;
    if (!ilkMuvekkilId) continue; // muvekkilsiz dosya olagan akista olusamaz, savunma amacli atla

    const kume = await prisma.uyusmazlikGrubu.create({
      data: { musteriId: ilkMuvekkilId, ad: dosya.konu },
    });
    await prisma.davaDosyasi.update({
      where: { id: dosya.id },
      data: { uyusmazlikGrubuId: kume.id },
    });
    baglanan += 1;
  }
  if (baglanan > 0) {
    console.log(`✓ Dosya Kümesi: ${baglanan} kümesiz dosya için otomatik tekil küme oluşturuldu.`);
  }
}

// Yukaridaki fonksiyondan SONRA calismali (her dosyanin artik kesin bir
// kumesi oldugu varsayimina dayanir). Kumesiz bir para kaydi, baglantili
// bir dosyasi varsa o dosyanin kumesine, hic dosyasi yoksa musteri altinda
// "Siniflandirilmamis Kayitlar" adinda (idempotent, tekrar aranip
// bulunan) bir kumeye baglanir.
async function kumesizParaKayitlariniBackfillEt() {
  const kumesizler = await prisma.musteriParaTrafigi.findMany({
    where: { uyusmazlikGrubuId: null },
    include: { dosyalar: { include: { dosya: true }, take: 1 } },
  });

  let baglanan = 0;
  for (const kayit of kumesizler) {
    let kumeId = kayit.dosyalar[0]?.dosya.uyusmazlikGrubuId ?? null;
    if (!kumeId) {
      const mevcutKume = await prisma.uyusmazlikGrubu.findFirst({
        where: { musteriId: kayit.musteriId, ad: "Sınıflandırılmamış Kayıtlar" },
      });
      kumeId = mevcutKume
        ? mevcutKume.id
        : (
            await prisma.uyusmazlikGrubu.create({
              data: { musteriId: kayit.musteriId, ad: "Sınıflandırılmamış Kayıtlar" },
            })
          ).id;
    }
    await prisma.musteriParaTrafigi.update({
      where: { id: kayit.id },
      data: { uyusmazlikGrubuId: kumeId },
    });
    baglanan += 1;
  }
  if (baglanan > 0) {
    console.log(`✓ Dosya Kümesi: ${baglanan} para kaydı için küme bağlantısı tamamlandı.`);
  }
}

// aciklama alani NOT NULL'a gecmeden once bos/null kayitlari doldurur.
async function paraKaydiAciklamasiBackfillEt() {
  const { count } = await prisma.musteriParaTrafigi.updateMany({
    where: { OR: [{ aciklama: null }, { aciklama: "" }] },
    data: { aciklama: "-" },
  });
  if (count > 0) {
    console.log(`✓ Para Kaydı: ${count} boş açıklama "-" ile dolduruldu.`);
  }
}

async function main() {
  await secenekListeleriniOlustur();
  await baslangicKullanicisiniOlustur();
  await gelistirmeKutusunuSenkronizeEt();
  await yinelenenKarsiTaraflariBirlestir();
  await yinelenenUyusmazlikGruplariniBirlestir();
  await menuOgeleriniOlustur();
  await formAlanDuzeniOlustur();
  await kumesizDosyalariBackfillEt();
  await kumesizParaKayitlariniBackfillEt();
  await paraKaydiAciklamasiBackfillEt();
}

main()
  .catch((hata) => {
    console.error(hata);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
