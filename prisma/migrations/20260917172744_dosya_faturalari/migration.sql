-- CreateTable
CREATE TABLE "dosya_faturalari" (
    "id" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "turId" TEXT NOT NULL,
    "aciklama" TEXT NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "durumId" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dosya_faturalari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dosya_faturalari_dosyaId_idx" ON "dosya_faturalari"("dosyaId");

-- CreateIndex
CREATE INDEX "dosya_faturalari_turId_idx" ON "dosya_faturalari"("turId");

-- CreateIndex
CREATE INDEX "dosya_faturalari_durumId_idx" ON "dosya_faturalari"("durumId");

-- AddForeignKey
ALTER TABLE "dosya_faturalari" ADD CONSTRAINT "dosya_faturalari_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dosya_faturalari" ADD CONSTRAINT "dosya_faturalari_turId_fkey" FOREIGN KEY ("turId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dosya_faturalari" ADD CONSTRAINT "dosya_faturalari_durumId_fkey" FOREIGN KEY ("durumId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;
