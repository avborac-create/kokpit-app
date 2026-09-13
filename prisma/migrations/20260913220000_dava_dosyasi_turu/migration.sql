-- AlterTable
ALTER TABLE "dava_dosyalari" ADD COLUMN "turId" TEXT;

-- CreateIndex
CREATE INDEX "dava_dosyalari_turId_idx" ON "dava_dosyalari"("turId");

-- AddForeignKey
ALTER TABLE "dava_dosyalari" ADD CONSTRAINT "dava_dosyalari_turId_fkey" FOREIGN KEY ("turId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;
