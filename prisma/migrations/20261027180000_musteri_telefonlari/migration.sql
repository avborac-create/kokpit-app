-- Musteri telefon rehberi (numara + tip + aidiyet + sifat). Yeni tablo; mevcut kayitlara dokunmaz.
CREATE TABLE "musteri_telefonlari" (
    "id" TEXT NOT NULL,
    "musteriId" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "telefonTipi" TEXT,
    "aidiyet" TEXT,
    "sifat" TEXT,
    "siraNo" INTEGER NOT NULL DEFAULT 0,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "musteri_telefonlari_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "musteri_telefonlari_musteriId_idx" ON "musteri_telefonlari"("musteriId");

ALTER TABLE "musteri_telefonlari" ADD CONSTRAINT "musteri_telefonlari_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "musteriler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
