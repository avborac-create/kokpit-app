-- CreateTable
CREATE TABLE "haciz_raporlari" (
    "id" TEXT NOT NULL,
    "icraDosyasiId" TEXT NOT NULL,
    "hacizTarihi" TIMESTAMP(3) NOT NULL,
    "islemYapan" TEXT,
    "irtibatNumarasi" TEXT,
    "muhafazaId" TEXT,
    "istihkakId" TEXT,
    "kiymetTakdiriId" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "haciz_raporlari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "haciz_raporlari_icraDosyasiId_idx" ON "haciz_raporlari"("icraDosyasiId");

-- CreateIndex
CREATE INDEX "haciz_raporlari_muhafazaId_idx" ON "haciz_raporlari"("muhafazaId");

-- CreateIndex
CREATE INDEX "haciz_raporlari_istihkakId_idx" ON "haciz_raporlari"("istihkakId");

-- CreateIndex
CREATE INDEX "haciz_raporlari_kiymetTakdiriId_idx" ON "haciz_raporlari"("kiymetTakdiriId");

-- AddForeignKey
ALTER TABLE "haciz_raporlari" ADD CONSTRAINT "haciz_raporlari_icraDosyasiId_fkey" FOREIGN KEY ("icraDosyasiId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "haciz_raporlari" ADD CONSTRAINT "haciz_raporlari_muhafazaId_fkey" FOREIGN KEY ("muhafazaId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "haciz_raporlari" ADD CONSTRAINT "haciz_raporlari_istihkakId_fkey" FOREIGN KEY ("istihkakId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "haciz_raporlari" ADD CONSTRAINT "haciz_raporlari_kiymetTakdiriId_fkey" FOREIGN KEY ("kiymetTakdiriId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;
