-- AlterTable
ALTER TABLE "musteri_para_trafigi" ADD COLUMN     "dosyaId" TEXT;

-- CreateTable
CREATE TABLE "dava_dosyalari" (
    "id" TEXT NOT NULL,
    "dosyaNo" TEXT,
    "konu" TEXT NOT NULL,
    "durumId" TEXT NOT NULL,
    "sorumluAvukatId" TEXT,
    "acilisTarihi" TIMESTAMP(3) NOT NULL,
    "kapanisTarihi" TIMESTAMP(3),
    "aciklama" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dava_dosyalari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dosya_muvekkilleri" (
    "id" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "musteriId" TEXT NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dosya_muvekkilleri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "musteri_para_trafigi_dosyaId_idx" ON "musteri_para_trafigi"("dosyaId");

-- CreateIndex
CREATE INDEX "dava_dosyalari_durumId_idx" ON "dava_dosyalari"("durumId");

-- CreateIndex
CREATE INDEX "dava_dosyalari_sorumluAvukatId_idx" ON "dava_dosyalari"("sorumluAvukatId");

-- CreateIndex
CREATE UNIQUE INDEX "dosya_muvekkilleri_dosyaId_musteriId_key" ON "dosya_muvekkilleri"("dosyaId", "musteriId");

-- CreateIndex
CREATE INDEX "dosya_muvekkilleri_musteriId_idx" ON "dosya_muvekkilleri"("musteriId");

-- AddForeignKey
ALTER TABLE "musteri_para_trafigi" ADD CONSTRAINT "musteri_para_trafigi_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dava_dosyalari" ADD CONSTRAINT "dava_dosyalari_durumId_fkey" FOREIGN KEY ("durumId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dava_dosyalari" ADD CONSTRAINT "dava_dosyalari_sorumluAvukatId_fkey" FOREIGN KEY ("sorumluAvukatId") REFERENCES "kullanicilar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dosya_muvekkilleri" ADD CONSTRAINT "dosya_muvekkilleri_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dosya_muvekkilleri" ADD CONSTRAINT "dosya_muvekkilleri_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "musteriler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
