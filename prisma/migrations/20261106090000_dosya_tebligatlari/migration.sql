-- Dosya tebligatlari - additive (yeni tablo)
CREATE TABLE "dosya_tebligatlari" (
  "id" TEXT NOT NULL,
  "dosyaId" TEXT NOT NULL,
  "yon" TEXT NOT NULL DEFAULT 'GELEN',
  "baslik" TEXT NOT NULL,
  "muhatap" TEXT,
  "yol" TEXT,
  "barkod" TEXT,
  "gonderimTarihi" DATE,
  "tebligTarihi" DATE,
  "durum" TEXT NOT NULL DEFAULT 'BEKLIYOR',
  "sureGun" INTEGER,
  "sonTarih" DATE,
  "gorevId" TEXT,
  "not" TEXT,
  "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "guncellemeTarihi" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dosya_tebligatlari_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dosya_tebligatlari_dosyaId_idx" ON "dosya_tebligatlari"("dosyaId");
ALTER TABLE "dosya_tebligatlari" ADD CONSTRAINT "dosya_tebligatlari_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
