-- Dilekce Yonetimi (additive: yeni tablo)
CREATE TABLE "dilekceler" (
    "id" TEXT NOT NULL,
    "davaDosyasiId" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'TASLAK',
    "gonderimTarihi" DATE,
    "gonderimYolu" TEXT,
    "uyapEvrakNo" TEXT,
    "sonrakiAdimVade" DATE,
    "notlar" TEXT,
    "isId" TEXT,
    "olusturanId" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dilekceler_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dilekceler_davaDosyasiId_idx" ON "dilekceler"("davaDosyasiId");
CREATE INDEX "dilekceler_durum_idx" ON "dilekceler"("durum");
CREATE INDEX "dilekceler_isId_idx" ON "dilekceler"("isId");
ALTER TABLE "dilekceler" ADD CONSTRAINT "dilekceler_davaDosyasiId_fkey" FOREIGN KEY ("davaDosyasiId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
