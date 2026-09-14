-- CreateTable: MusteriParaTrafigi -> coklu Dosya Kumesi/kullanim amaci dagitimi
CREATE TABLE "para_trafigi_dagitimi" (
    "id" TEXT NOT NULL,
    "paraTrafigiId" TEXT NOT NULL,
    "uyusmazlikGrubuId" TEXT NOT NULL,
    "dosyaId" TEXT,
    "kullanimAmaciId" TEXT NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "para_trafigi_dagitimi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "para_trafigi_dagitimi_paraTrafigiId_idx" ON "para_trafigi_dagitimi"("paraTrafigiId");

-- CreateIndex
CREATE INDEX "para_trafigi_dagitimi_uyusmazlikGrubuId_idx" ON "para_trafigi_dagitimi"("uyusmazlikGrubuId");

-- CreateIndex
CREATE INDEX "para_trafigi_dagitimi_dosyaId_idx" ON "para_trafigi_dagitimi"("dosyaId");

-- CreateIndex
CREATE INDEX "para_trafigi_dagitimi_kullanimAmaciId_idx" ON "para_trafigi_dagitimi"("kullanimAmaciId");

-- AddForeignKey
ALTER TABLE "para_trafigi_dagitimi" ADD CONSTRAINT "para_trafigi_dagitimi_paraTrafigiId_fkey" FOREIGN KEY ("paraTrafigiId") REFERENCES "musteri_para_trafigi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_trafigi_dagitimi" ADD CONSTRAINT "para_trafigi_dagitimi_uyusmazlikGrubuId_fkey" FOREIGN KEY ("uyusmazlikGrubuId") REFERENCES "uyusmazlik_gruplari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_trafigi_dagitimi" ADD CONSTRAINT "para_trafigi_dagitimi_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_trafigi_dagitimi" ADD CONSTRAINT "para_trafigi_dagitimi_kullanimAmaciId_fkey" FOREIGN KEY ("kullanimAmaciId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
