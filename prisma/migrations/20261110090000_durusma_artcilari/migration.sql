-- Duruşma Artçıları (additive): sonuç kaydı + duruşma masraf föyü satırları
CREATE TABLE "durusma_artcilari" (
    "id" TEXT NOT NULL,
    "davaDosyasiId" TEXT NOT NULL,
    "durusmaTarihi" TIMESTAMP(3) NOT NULL,
    "sonuc" TEXT NOT NULL,
    "yeniDurusmaTarihi" TIMESTAMP(3),
    "akibet" TEXT,
    "notlar" TEXT,
    "yargiKolu" TEXT,
    "yasalSureSonu" DATE,
    "takipPeriyotGun" INTEGER,
    "muvekkileBilgiTarihi" TIMESTAMP(3),
    "olusturanId" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "durusma_artcilari_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "durusma_artcilari_davaDosyasiId_durusmaTarihi_key" ON "durusma_artcilari"("davaDosyasiId", "durusmaTarihi");
ALTER TABLE "durusma_artcilari" ADD CONSTRAINT "durusma_artcilari_davaDosyasiId_fkey" FOREIGN KEY ("davaDosyasiId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "durusma_masraflari" (
    "id" TEXT NOT NULL,
    "davaDosyasiId" TEXT NOT NULL,
    "durusmaTarihi" TIMESTAMP(3),
    "personelId" TEXT,
    "tarih" DATE NOT NULL,
    "kalem" TEXT NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "odeyen" TEXT NOT NULL DEFAULT 'AVUKAT',
    "belgeVar" BOOLEAN NOT NULL DEFAULT false,
    "aciklama" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "durusma_masraflari_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "durusma_masraflari_davaDosyasiId_idx" ON "durusma_masraflari"("davaDosyasiId");
CREATE INDEX "durusma_masraflari_personelId_tarih_idx" ON "durusma_masraflari"("personelId", "tarih");
ALTER TABLE "durusma_masraflari" ADD CONSTRAINT "durusma_masraflari_davaDosyasiId_fkey" FOREIGN KEY ("davaDosyasiId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
