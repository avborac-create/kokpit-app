-- Gorevi dava dosyasina baglama (additive)
ALTER TABLE "isler" ADD COLUMN "dosyaId" TEXT;
CREATE INDEX "isler_dosyaId_idx" ON "isler"("dosyaId");
