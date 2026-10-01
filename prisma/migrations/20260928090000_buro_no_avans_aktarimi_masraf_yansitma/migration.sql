-- CreateEnum
CREATE TYPE "MasrafYansitmaHedefi" AS ENUM ('MUVEKKIL', 'BURO', 'BORCLU');

-- AlterTable
ALTER TABLE "dava_dosyalari" ADD COLUMN     "buroNo" TEXT;

-- AlterTable
ALTER TABLE "dosya_masraflari" ADD COLUMN     "yansitmaHedefi" "MasrafYansitmaHedefi" NOT NULL DEFAULT 'MUVEKKIL';

-- CreateTable
CREATE TABLE "dosya_avans_aktarimlari" (
    "id" TEXT NOT NULL,
    "kaynakDosyaId" TEXT NOT NULL,
    "hedefDosyaId" TEXT NOT NULL,
    "cariKodId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "aciklama" TEXT NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dosya_avans_aktarimlari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dosya_avans_aktarimlari_kaynakDosyaId_idx" ON "dosya_avans_aktarimlari"("kaynakDosyaId");

-- CreateIndex
CREATE INDEX "dosya_avans_aktarimlari_hedefDosyaId_idx" ON "dosya_avans_aktarimlari"("hedefDosyaId");

-- CreateIndex
CREATE INDEX "dosya_avans_aktarimlari_cariKodId_idx" ON "dosya_avans_aktarimlari"("cariKodId");

-- CreateIndex
CREATE INDEX "dava_dosyalari_buroNo_idx" ON "dava_dosyalari"("buroNo");

-- AddForeignKey
ALTER TABLE "dosya_avans_aktarimlari" ADD CONSTRAINT "dosya_avans_aktarimlari_kaynakDosyaId_fkey" FOREIGN KEY ("kaynakDosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dosya_avans_aktarimlari" ADD CONSTRAINT "dosya_avans_aktarimlari_hedefDosyaId_fkey" FOREIGN KEY ("hedefDosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dosya_avans_aktarimlari" ADD CONSTRAINT "dosya_avans_aktarimlari_cariKodId_fkey" FOREIGN KEY ("cariKodId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
