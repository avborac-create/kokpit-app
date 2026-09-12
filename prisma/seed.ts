import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Genisletilebilir secenek listeleri ve baslangic degerleri.
// Yeni bir deger eklemek icin bu diziye satir eklemek yeterli; sema degismez.
const SECENEK_LISTELERI: {
  anahtar: string;
  ad: string;
  degerler: { kod: string; etiket: string }[];
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
      { kod: "tahsilat", etiket: "Tahsilat" },
      { kod: "borc", etiket: "Borç" },
      { kod: "masraf_yansitma", etiket: "Masraf Yansıtma" },
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
];

async function secenekListeleriniOlustur() {
  for (const liste of SECENEK_LISTELERI) {
    const olusturulanListe = await prisma.secenekListesi.upsert({
      where: { anahtar: liste.anahtar },
      update: { ad: liste.ad },
      create: { anahtar: liste.anahtar, ad: liste.ad },
    });

    for (const [index, deger] of liste.degerler.entries()) {
      await prisma.secenekDegeri.upsert({
        where: { listeId_kod: { listeId: olusturulanListe.id, kod: deger.kod } },
        update: { etiket: deger.etiket, siraNo: index },
        create: {
          listeId: olusturulanListe.id,
          kod: deger.kod,
          etiket: deger.etiket,
          siraNo: index,
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
