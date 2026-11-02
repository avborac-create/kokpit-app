-- Finans > Kasa / Nakit Yonetimi (yalniz yeni tablolar; mevcut veriye dokunmaz)
CREATE TYPE "kasa_yon" AS ENUM ('GIRIS', 'CIKIS');

CREATE TABLE "kasa_kodlari" (
  "id" TEXT NOT NULL,
  "no" INTEGER NOT NULL,
  "ad" TEXT NOT NULL,
  "yon" "kasa_yon" NOT NULL,
  "personelMi" BOOLEAN NOT NULL DEFAULT false,
  "aktifMi" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "kasa_kodlari_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "kasa_kodlari_no_key" ON "kasa_kodlari"("no");

CREATE TABLE "kasa_hareketleri" (
  "id" TEXT NOT NULL,
  "kodId" TEXT NOT NULL,
  "yon" "kasa_yon" NOT NULL,
  "tarih" TIMESTAMP(3) NOT NULL,
  "tutar" DECIMAL(14,2) NOT NULL,
  "aciklama" TEXT,
  "personelId" TEXT,
  "olusturanId" TEXT,
  "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kasa_hareketleri_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kasa_hareketleri_tarih_idx" ON "kasa_hareketleri"("tarih");
CREATE INDEX "kasa_hareketleri_personelId_idx" ON "kasa_hareketleri"("personelId");
ALTER TABLE "kasa_hareketleri" ADD CONSTRAINT "kasa_hareketleri_kodId_fkey" FOREIGN KEY ("kodId") REFERENCES "kasa_kodlari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "kasa_sayimlari" (
  "id" TEXT NOT NULL,
  "tarih" TIMESTAMP(3) NOT NULL,
  "sayilan" DECIMAL(14,2) NOT NULL,
  "beklenen" DECIMAL(14,2) NOT NULL,
  "fark" DECIMAL(14,2) NOT NULL,
  "aciklama" TEXT,
  "olusturanId" TEXT,
  "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kasa_sayimlari_pkey" PRIMARY KEY ("id")
);

INSERT INTO "kasa_kodlari" ("id","no","ad","yon","personelMi") VALUES
  (gen_random_uuid()::text, 10, 'Bankadan kasaya nakit girişi', 'GIRIS', false),
  (gen_random_uuid()::text, 11, 'Personelden geri ödeme / iade', 'GIRIS', true),
  (gen_random_uuid()::text, 19, 'Diğer nakit girişi', 'GIRIS', false),
  (gen_random_uuid()::text, 20, 'Personele avans', 'CIKIS', true),
  (gen_random_uuid()::text, 21, 'Personele maaş / prim / harcırah', 'CIKIS', true),
  (gen_random_uuid()::text, 22, 'Büro gideri', 'CIKIS', false),
  (gen_random_uuid()::text, 23, 'Dosya masrafı (nakit)', 'CIKIS', false),
  (gen_random_uuid()::text, 24, 'Müvekkile nakit ödeme / iade', 'CIKIS', false),
  (gen_random_uuid()::text, 25, 'Bankaya yatırılan nakit', 'CIKIS', false),
  (gen_random_uuid()::text, 29, 'Diğer nakit çıkışı', 'CIKIS', false);
