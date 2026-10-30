-- Ana sayfa takvimi: durusma/gorev/toplanti/not ogeleri. Yalniz yeni tablo; mevcut kayitlar degismez.
CREATE TYPE "takvim_turu" AS ENUM ('DURUSMA', 'GOREV', 'TOPLANTI', 'NOT');
CREATE TABLE "takvim_ogeleri" (
    "id" TEXT NOT NULL,
    "tarih" DATE NOT NULL,
    "saat" TEXT,
    "baslik" TEXT NOT NULL,
    "tur" "takvim_turu" NOT NULL DEFAULT 'GOREV',
    "notlar" TEXT,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "tamamlandiMi" BOOLEAN NOT NULL DEFAULT false,
    "davaDosyasiId" TEXT,
    "cmkDosyasiId" TEXT,
    "olusturanId" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "takvim_ogeleri_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "takvim_ogeleri_tarih_idx" ON "takvim_ogeleri"("tarih");
CREATE INDEX "takvim_ogeleri_davaDosyasiId_idx" ON "takvim_ogeleri"("davaDosyasiId");
CREATE INDEX "takvim_ogeleri_cmkDosyasiId_idx" ON "takvim_ogeleri"("cmkDosyasiId");
ALTER TABLE "takvim_ogeleri" ADD CONSTRAINT "takvim_ogeleri_davaDosyasiId_fkey" FOREIGN KEY ("davaDosyasiId") REFERENCES "dava_dosyalari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "takvim_ogeleri" ADD CONSTRAINT "takvim_ogeleri_cmkDosyasiId_fkey" FOREIGN KEY ("cmkDosyasiId") REFERENCES "cmk_dosyalari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "takvim_ogeleri" ADD CONSTRAINT "takvim_ogeleri_olusturanId_fkey" FOREIGN KEY ("olusturanId") REFERENCES "kullanicilar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Kullanici bazli ana sayfa panel duzeni (bos sutun; mevcut kayitlar degismez).
ALTER TABLE "kullanicilar" ADD COLUMN "anaSayfaDuzeni" TEXT;
