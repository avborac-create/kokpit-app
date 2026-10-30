-- Evraklar dava dosyalarina da baglanabilsin: cmkDosyasiId bos olabilir, yeni davaDosyasiId eklenir. Mevcut kayitlar degismez.
ALTER TABLE "cmk_evraklari" ALTER COLUMN "cmkDosyasiId" DROP NOT NULL;
ALTER TABLE "cmk_evraklari" ADD COLUMN "davaDosyasiId" TEXT;
CREATE INDEX "cmk_evraklari_davaDosyasiId_idx" ON "cmk_evraklari"("davaDosyasiId");
ALTER TABLE "cmk_evraklari" ADD CONSTRAINT "cmk_evraklari_davaDosyasiId_fkey" FOREIGN KEY ("davaDosyasiId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
