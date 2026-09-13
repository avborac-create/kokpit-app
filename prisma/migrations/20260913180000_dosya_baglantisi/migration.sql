-- AlterTable
ALTER TABLE "dava_dosyalari" ADD COLUMN "bagliOlduguDosyaId" TEXT;

-- CreateIndex
CREATE INDEX "dava_dosyalari_bagliOlduguDosyaId_idx" ON "dava_dosyalari"("bagliOlduguDosyaId");

-- AddForeignKey
ALTER TABLE "dava_dosyalari" ADD CONSTRAINT "dava_dosyalari_bagliOlduguDosyaId_fkey" FOREIGN KEY ("bagliOlduguDosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
