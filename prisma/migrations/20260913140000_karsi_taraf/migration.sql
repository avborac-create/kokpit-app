-- CreateTable
CREATE TABLE "karsi_taraflar" (
    "id" TEXT NOT NULL,
    "musteriId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tanimlayiciKod" TEXT,
    "notlar" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "karsi_taraflar_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "dava_dosyalari" ADD COLUMN     "karsiTarafId" TEXT;

-- CreateIndex
CREATE INDEX "karsi_taraflar_musteriId_idx" ON "karsi_taraflar"("musteriId");

-- CreateIndex
CREATE INDEX "dava_dosyalari_karsiTarafId_idx" ON "dava_dosyalari"("karsiTarafId");

-- AddForeignKey
ALTER TABLE "karsi_taraflar" ADD CONSTRAINT "karsi_taraflar_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "musteriler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dava_dosyalari" ADD CONSTRAINT "dava_dosyalari_karsiTarafId_fkey" FOREIGN KEY ("karsiTarafId") REFERENCES "karsi_taraflar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
