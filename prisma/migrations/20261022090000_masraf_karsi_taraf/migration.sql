-- AlterTable
ALTER TABLE "dosya_masraflari" ADD COLUMN "karsiTarafId" TEXT;

-- AddForeignKey
ALTER TABLE "dosya_masraflari" ADD CONSTRAINT "dosya_masraflari_karsiTarafId_fkey" FOREIGN KEY ("karsiTarafId") REFERENCES "karsi_taraflar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
