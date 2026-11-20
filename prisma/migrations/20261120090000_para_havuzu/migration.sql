-- Finans > Para Havuzu (yalniz yeni tablolar; mevcut veriye dokunmaz)
CREATE TABLE "para_havuzu_girisleri" (
  "id" TEXT NOT NULL,
  "tarih" TIMESTAMP(3) NOT NULL,
  "tutar" DECIMAL(14,2) NOT NULL,
  "kaynak" TEXT,
  "aciklama" TEXT,
  "odemeYontemiId" TEXT,
  "olusturanId" TEXT,
  "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "para_havuzu_girisleri_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "para_havuzu_girisleri_tarih_idx" ON "para_havuzu_girisleri"("tarih");

CREATE TABLE "para_havuzu_dagitimlari" (
  "id" TEXT NOT NULL,
  "girisId" TEXT NOT NULL,
  "musteriId" TEXT NOT NULL,
  "dosyaId" TEXT,
  "tutar" DECIMAL(14,2) NOT NULL,
  "tarih" TIMESTAMP(3) NOT NULL,
  "cariHareketId" TEXT,
  "olusturanId" TEXT,
  "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "para_havuzu_dagitimlari_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "para_havuzu_dagitimlari_girisId_idx" ON "para_havuzu_dagitimlari"("girisId");
ALTER TABLE "para_havuzu_dagitimlari" ADD CONSTRAINT "para_havuzu_dagitimlari_girisId_fkey" FOREIGN KEY ("girisId") REFERENCES "para_havuzu_girisleri"("id") ON DELETE CASCADE ON UPDATE CASCADE;
