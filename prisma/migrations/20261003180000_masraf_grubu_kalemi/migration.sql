-- AlterTable
ALTER TABLE "dosya_masraflari" ADD COLUMN     "grupId" TEXT,
ADD COLUMN     "kalemId" TEXT;

-- CreateIndex
CREATE INDEX "dosya_masraflari_grupId_idx" ON "dosya_masraflari"("grupId");

-- AddForeignKey
ALTER TABLE "dosya_masraflari" ADD CONSTRAINT "dosya_masraflari_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dosya_masraflari" ADD CONSTRAINT "dosya_masraflari_kalemId_fkey" FOREIGN KEY ("kalemId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;
