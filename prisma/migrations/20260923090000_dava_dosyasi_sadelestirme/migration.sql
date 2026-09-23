-- AlterTable
ALTER TABLE "dava_dosyalari" ADD COLUMN     "davaTuruId" TEXT,
ADD COLUMN     "durusmaTarihi" TIMESTAMP(3),
ADD COLUMN     "talepSonucu" TEXT;

-- CreateIndex
CREATE INDEX "dava_dosyalari_davaTuruId_idx" ON "dava_dosyalari"("davaTuruId");

-- AddForeignKey
ALTER TABLE "dava_dosyalari" ADD CONSTRAINT "dava_dosyalari_davaTuruId_fkey" FOREIGN KEY ("davaTuruId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;
