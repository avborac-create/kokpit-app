-- AlterTable
ALTER TABLE "dava_dosyalari" ADD COLUMN "hukukiIliskiTuruId" TEXT;

-- CreateIndex
CREATE INDEX "dava_dosyalari_hukukiIliskiTuruId_idx" ON "dava_dosyalari"("hukukiIliskiTuruId");

-- AddForeignKey
ALTER TABLE "dava_dosyalari" ADD CONSTRAINT "dava_dosyalari_hukukiIliskiTuruId_fkey" FOREIGN KEY ("hukukiIliskiTuruId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;
