-- CreateEnum
CREATE TYPE "kullanici_rolu" AS ENUM ('YONETICI', 'ORTAK', 'SORUMLU_AVUKAT', 'PERSONEL');

-- CreateTable
CREATE TABLE "kullanicilar" (
    "id" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "eposta" TEXT NOT NULL,
    "sifreHash" TEXT NOT NULL,
    "rol" "kullanici_rolu" NOT NULL DEFAULT 'PERSONEL',
    "aktifMi" BOOLEAN NOT NULL DEFAULT true,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kullanicilar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secenek_listeleri" (
    "id" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aciklama" TEXT,

    CONSTRAINT "secenek_listeleri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secenek_degerleri" (
    "id" TEXT NOT NULL,
    "listeId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "etiket" TEXT NOT NULL,
    "siraNo" INTEGER NOT NULL DEFAULT 0,
    "aktifMi" BOOLEAN NOT NULL DEFAULT true,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secenek_degerleri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "musteriler" (
    "id" TEXT NOT NULL,
    "adSoyadUnvan" TEXT NOT NULL,
    "tipId" TEXT NOT NULL,
    "telefon" TEXT,
    "eposta" TEXT,
    "adres" TEXT,
    "durumId" TEXT NOT NULL,
    "sorumluAvukatId" TEXT,
    "notlar" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "musteriler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "musteri_para_trafigi" (
    "id" TEXT NOT NULL,
    "musteriId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "tipId" TEXT NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "aciklama" TEXT,
    "ilgiliDosyaId" TEXT,
    "durumId" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "musteri_para_trafigi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kullanicilar_eposta_key" ON "kullanicilar"("eposta");

-- CreateIndex
CREATE UNIQUE INDEX "secenek_listeleri_anahtar_key" ON "secenek_listeleri"("anahtar");

-- CreateIndex
CREATE UNIQUE INDEX "secenek_degerleri_listeId_kod_key" ON "secenek_degerleri"("listeId", "kod");

-- CreateIndex
CREATE INDEX "musteriler_durumId_idx" ON "musteriler"("durumId");

-- CreateIndex
CREATE INDEX "musteriler_sorumluAvukatId_idx" ON "musteriler"("sorumluAvukatId");

-- CreateIndex
CREATE INDEX "musteri_para_trafigi_musteriId_idx" ON "musteri_para_trafigi"("musteriId");

-- CreateIndex
CREATE INDEX "musteri_para_trafigi_durumId_idx" ON "musteri_para_trafigi"("durumId");

-- AddForeignKey
ALTER TABLE "secenek_degerleri" ADD CONSTRAINT "secenek_degerleri_listeId_fkey" FOREIGN KEY ("listeId") REFERENCES "secenek_listeleri"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "musteriler" ADD CONSTRAINT "musteriler_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "musteriler" ADD CONSTRAINT "musteriler_durumId_fkey" FOREIGN KEY ("durumId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "musteriler" ADD CONSTRAINT "musteriler_sorumluAvukatId_fkey" FOREIGN KEY ("sorumluAvukatId") REFERENCES "kullanicilar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "musteri_para_trafigi" ADD CONSTRAINT "musteri_para_trafigi_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "musteriler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "musteri_para_trafigi" ADD CONSTRAINT "musteri_para_trafigi_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "musteri_para_trafigi" ADD CONSTRAINT "musteri_para_trafigi_durumId_fkey" FOREIGN KEY ("durumId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "musteri_para_trafigi" ADD CONSTRAINT "musteri_para_trafigi_kaynakId_fkey" FOREIGN KEY ("kaynakId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
