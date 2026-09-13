-- CreateTable
CREATE TABLE "dosya_karsi_taraflari" (
    "id" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "karsiTarafId" TEXT NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dosya_karsi_taraflari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dosya_karsi_taraflari_dosyaId_karsiTarafId_key" ON "dosya_karsi_taraflari"("dosyaId", "karsiTarafId");

-- CreateIndex
CREATE INDEX "dosya_karsi_taraflari_karsiTarafId_idx" ON "dosya_karsi_taraflari"("karsiTarafId");

-- AddForeignKey
ALTER TABLE "dosya_karsi_taraflari" ADD CONSTRAINT "dosya_karsi_taraflari_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dosya_karsi_taraflari" ADD CONSTRAINT "dosya_karsi_taraflari_karsiTarafId_fkey" FOREIGN KEY ("karsiTarafId") REFERENCES "karsi_taraflar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mevcut tekil karsiTarafId degerlerini yeni coka-cok ara tabloya tasi
-- (veri kaybi olmadan) - her dosyanin en fazla bir karsi tarafi oldugu
-- icin (dosyaId, karsiTarafId) cifti zaten essizdir.
INSERT INTO "dosya_karsi_taraflari" ("id", "dosyaId", "karsiTarafId")
SELECT md5(d."id" || '_' || d."karsiTarafId"), d."id", d."karsiTarafId"
FROM "dava_dosyalari" d
WHERE d."karsiTarafId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "dava_dosyalari" DROP CONSTRAINT "dava_dosyalari_karsiTarafId_fkey";

-- DropIndex
DROP INDEX "dava_dosyalari_karsiTarafId_idx";

-- AlterTable
ALTER TABLE "dava_dosyalari" DROP COLUMN "karsiTarafId";
