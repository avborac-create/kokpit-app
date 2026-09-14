-- AlterTable: UyusmazlikGrubu (UI'da "Dosya Kümesi") - durum
ALTER TABLE "uyusmazlik_gruplari" ADD COLUMN "durumId" TEXT;

-- CreateIndex
CREATE INDEX "uyusmazlik_gruplari_durumId_idx" ON "uyusmazlik_gruplari"("durumId");

-- AddForeignKey
ALTER TABLE "uyusmazlik_gruplari" ADD CONSTRAINT "uyusmazlik_gruplari_durumId_fkey" FOREIGN KEY ("durumId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: UyusmazlikGrubu <-> KarsiTaraf coka-cok
CREATE TABLE "uyusmazlik_grubu_karsi_taraflari" (
    "id" TEXT NOT NULL,
    "uyusmazlikGrubuId" TEXT NOT NULL,
    "karsiTarafId" TEXT NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uyusmazlik_grubu_karsi_taraflari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uyusmazlik_grubu_karsi_taraflari_uyusmazlikGrubuId_karsiTar_key" ON "uyusmazlik_grubu_karsi_taraflari"("uyusmazlikGrubuId", "karsiTarafId");

-- CreateIndex
CREATE INDEX "uyusmazlik_grubu_karsi_taraflari_karsiTarafId_idx" ON "uyusmazlik_grubu_karsi_taraflari"("karsiTarafId");

-- AddForeignKey
ALTER TABLE "uyusmazlik_grubu_karsi_taraflari" ADD CONSTRAINT "uyusmazlik_grubu_karsi_taraflari_uyusmazlikGrubuId_fkey" FOREIGN KEY ("uyusmazlikGrubuId") REFERENCES "uyusmazlik_gruplari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uyusmazlik_grubu_karsi_taraflari" ADD CONSTRAINT "uyusmazlik_grubu_karsi_taraflari_karsiTarafId_fkey" FOREIGN KEY ("karsiTarafId") REFERENCES "karsi_taraflar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: MusteriParaTrafigi - sahiplik + belge referansi
ALTER TABLE "musteri_para_trafigi" ADD COLUMN "sahiplikId" TEXT;
ALTER TABLE "musteri_para_trafigi" ADD COLUMN "belgeReferansi" TEXT;

-- CreateIndex
CREATE INDEX "musteri_para_trafigi_sahiplikId_idx" ON "musteri_para_trafigi"("sahiplikId");

-- AddForeignKey
ALTER TABLE "musteri_para_trafigi" ADD CONSTRAINT "musteri_para_trafigi_sahiplikId_fkey" FOREIGN KEY ("sahiplikId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: DosyaMasrafi - durum (iptal edilebilme)
ALTER TABLE "dosya_masraflari" ADD COLUMN "durumId" TEXT;

-- CreateIndex
CREATE INDEX "dosya_masraflari_durumId_idx" ON "dosya_masraflari"("durumId");

-- AddForeignKey
ALTER TABLE "dosya_masraflari" ADD CONSTRAINT "dosya_masraflari_durumId_fkey" FOREIGN KEY ("durumId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;
