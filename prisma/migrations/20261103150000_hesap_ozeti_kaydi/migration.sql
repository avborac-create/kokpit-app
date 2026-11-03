-- Muvekkil hesap ozeti kayitlari (gonderildi mi takibi) - additive
CREATE TABLE "hesap_ozeti_kayitlari" (
  "id" TEXT NOT NULL,
  "musteriId" TEXT NOT NULL,
  "olusturanId" TEXT,
  "toplam" DOUBLE PRECISION NOT NULL,
  "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sonuc" TEXT,
  "sonucTarihi" TIMESTAMP(3),
  "yol" TEXT,
  CONSTRAINT "hesap_ozeti_kayitlari_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hesap_ozeti_kayitlari_musteriId_idx" ON "hesap_ozeti_kayitlari"("musteriId");
ALTER TABLE "hesap_ozeti_kayitlari" ADD CONSTRAINT "hesap_ozeti_kayitlari_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "musteriler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
