-- Eski sistem (Excel) verilerinin ice aktarimi icin: hem DavaDosyasi hem
-- CMKDosyasi tarafina, kaynak satiri izlenebilir kilan ve tekrar
-- calistirilan bir import'un ayni satiri iki kez eklememesini saglayan bir
-- benzersiz anahtar + Kokpit'in sade alanlarina karsiligi olmayan kaynak
-- sutunlari icin bir JSON alani eklenir. Hicbir mevcut alan/deger degismez.

-- AlterTable: dava_dosyalari
ALTER TABLE "dava_dosyalari" ADD COLUMN "legacyKaynakAnahtari" TEXT;
ALTER TABLE "dava_dosyalari" ADD COLUMN "legacyImportData" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "dava_dosyalari_legacyKaynakAnahtari_key" ON "dava_dosyalari"("legacyKaynakAnahtari");

-- AlterTable: cmk_dosyalari - birim/dosyaNo artik nullable (bkz. schema.prisma
-- yorumu: formda hala zorunlu, sadece kaynakta bu bilgiler yoksa import
-- script'inin tahmin etmeden kayit acabilmesi icin)
ALTER TABLE "cmk_dosyalari" ALTER COLUMN "birim" DROP NOT NULL;
ALTER TABLE "cmk_dosyalari" ALTER COLUMN "dosyaNo" DROP NOT NULL;

ALTER TABLE "cmk_dosyalari" ADD COLUMN "dosyaRumuzu" TEXT;
ALTER TABLE "cmk_dosyalari" ADD COLUMN "karsiTaraf" TEXT;
ALTER TABLE "cmk_dosyalari" ADD COLUMN "sifatimiz" TEXT;
ALTER TABLE "cmk_dosyalari" ADD COLUMN "orijinalDurum" TEXT;
ALTER TABLE "cmk_dosyalari" ADD COLUMN "legacyKaynakAnahtari" TEXT;
ALTER TABLE "cmk_dosyalari" ADD COLUMN "legacyImportData" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "cmk_dosyalari_legacyKaynakAnahtari_key" ON "cmk_dosyalari"("legacyKaynakAnahtari");
