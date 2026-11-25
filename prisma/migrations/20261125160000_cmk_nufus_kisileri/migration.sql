-- CMK "Muvekkil Bilgileri" (nufus kayit ornegi kisileri). Yalnizca ekleme; mevcut kayitlara dokunmaz.
ALTER TABLE "cmk_dosyalari" ADD COLUMN "nufusNotu" TEXT;

CREATE TABLE "cmk_nufus_kisileri" (
    "id" TEXT NOT NULL,
    "cmkDosyasiId" TEXT NOT NULL,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "bsn" TEXT,
    "yakinlik" TEXT NOT NULL,
    "cinsiyet" TEXT,
    "tckn" TEXT,
    "ad" TEXT NOT NULL,
    "soyad" TEXT,
    "babaAdi" TEXT,
    "anaAdi" TEXT,
    "dogumYeri" TEXT,
    "dogumTarihi" DATE,
    "medeniHal" TEXT,
    "tescilTarihi" DATE,
    "olaylar" TEXT,
    "degistirenAd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cmk_nufus_kisileri_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cmk_nufus_kisileri_cmkDosyasiId_idx" ON "cmk_nufus_kisileri"("cmkDosyasiId");
ALTER TABLE "cmk_nufus_kisileri" ADD CONSTRAINT "cmk_nufus_kisileri_cmkDosyasiId_fkey" FOREIGN KEY ("cmkDosyasiId") REFERENCES "cmk_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
