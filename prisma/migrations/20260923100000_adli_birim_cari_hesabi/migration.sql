-- CreateEnum
CREATE TYPE "adli_birim_hareket_yonu" AS ENUM ('ODEME', 'TAHSILAT');

-- CreateTable
CREATE TABLE "adli_birim_hareketleri" (
    "id" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "yon" "adli_birim_hareket_yonu" NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "aciklama" TEXT NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adli_birim_hareketleri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adli_birim_hareketleri_dosyaId_idx" ON "adli_birim_hareketleri"("dosyaId");

-- AddForeignKey
ALTER TABLE "adli_birim_hareketleri" ADD CONSTRAINT "adli_birim_hareketleri_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
