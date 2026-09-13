-- CreateTable
CREATE TABLE "uyusmazlik_gruplari" (
    "id" TEXT NOT NULL,
    "musteriId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "notlar" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uyusmazlik_gruplari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "uyusmazlik_gruplari_musteriId_idx" ON "uyusmazlik_gruplari"("musteriId");

-- AddForeignKey
ALTER TABLE "uyusmazlik_gruplari" ADD CONSTRAINT "uyusmazlik_gruplari_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "musteriler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "dava_dosyalari" ADD COLUMN "uyusmazlikGrubuId" TEXT;

-- CreateIndex
CREATE INDEX "dava_dosyalari_uyusmazlikGrubuId_idx" ON "dava_dosyalari"("uyusmazlikGrubuId");

-- AddForeignKey
ALTER TABLE "dava_dosyalari" ADD CONSTRAINT "dava_dosyalari_uyusmazlikGrubuId_fkey" FOREIGN KEY ("uyusmazlikGrubuId") REFERENCES "uyusmazlik_gruplari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "dosya_masraflari" (
    "id" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "cariKodId" TEXT NOT NULL,
    "turId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "aciklama" TEXT NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dosya_masraflari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dosya_masraflari_dosyaId_idx" ON "dosya_masraflari"("dosyaId");

-- CreateIndex
CREATE INDEX "dosya_masraflari_cariKodId_idx" ON "dosya_masraflari"("cariKodId");

-- CreateIndex
CREATE INDEX "dosya_masraflari_turId_idx" ON "dosya_masraflari"("turId");

-- AddForeignKey
ALTER TABLE "dosya_masraflari" ADD CONSTRAINT "dosya_masraflari_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dosya_masraflari" ADD CONSTRAINT "dosya_masraflari_cariKodId_fkey" FOREIGN KEY ("cariKodId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dosya_masraflari" ADD CONSTRAINT "dosya_masraflari_turId_fkey" FOREIGN KEY ("turId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
