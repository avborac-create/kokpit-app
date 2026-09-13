-- AlterTable
ALTER TABLE "musteri_para_trafigi" ADD COLUMN "uyusmazlikGrubuId" TEXT;

-- CreateIndex
CREATE INDEX "musteri_para_trafigi_uyusmazlikGrubuId_idx" ON "musteri_para_trafigi"("uyusmazlikGrubuId");

-- AddForeignKey
ALTER TABLE "musteri_para_trafigi" ADD CONSTRAINT "musteri_para_trafigi_uyusmazlikGrubuId_fkey" FOREIGN KEY ("uyusmazlikGrubuId") REFERENCES "uyusmazlik_gruplari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
