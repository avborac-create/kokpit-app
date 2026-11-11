-- Ekran gorunum tercihleri (or. cari hesaplar alaninin yerlesimi): buro varsayilani
-- (sahip = 'buro') ve kisisel tercih (sahip = kullanici id). Yalniz yeni tablo; mevcut veriye dokunmaz.
CREATE TABLE "ekran_tercihleri" (
    "sahip" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "deger" TEXT NOT NULL,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ekran_tercihleri_pkey" PRIMARY KEY ("sahip","anahtar")
);
