-- CreateTable
CREATE TABLE "karsi_taraf_alacaklari" (
    "id" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "aciklama" TEXT NOT NULL,
    "tahsilEdildiMi" BOOLEAN NOT NULL DEFAULT false,
    "tahsilTarihi" TIMESTAMP(3),
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "karsi_taraf_alacaklari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "karsi_taraf_alacaklari_dosyaId_idx" ON "karsi_taraf_alacaklari"("dosyaId");

-- AddForeignKey
ALTER TABLE "karsi_taraf_alacaklari" ADD CONSTRAINT "karsi_taraf_alacaklari_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
