-- AlterTable
ALTER TABLE "cmk_evraklari" ADD COLUMN "ozelKullaniciId" TEXT;

-- CreateIndex
CREATE INDEX "cmk_evraklari_ozelKullaniciId_idx" ON "cmk_evraklari"("ozelKullaniciId");
