-- AlterTable
ALTER TABLE "dava_dosyalari" ADD COLUMN     "anaDosyaId" TEXT,
ADD COLUMN     "altSiraNo" INTEGER;

-- CreateIndex
CREATE INDEX "dava_dosyalari_anaDosyaId_idx" ON "dava_dosyalari"("anaDosyaId");

-- AddForeignKey
ALTER TABLE "dava_dosyalari" ADD CONSTRAINT "dava_dosyalari_anaDosyaId_fkey" FOREIGN KEY ("anaDosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
