-- CreateEnum
CREATE TYPE "CariGrup" AS ENUM ('MUVEKKIL', 'BORCLU', 'ADLIYE');

-- AlterTable
ALTER TABLE "cari_hesaplar" ADD COLUMN     "grup" "CariGrup" NOT NULL DEFAULT 'MUVEKKIL',
ADD COLUMN     "tutulanHesapMi" BOOLEAN NOT NULL DEFAULT false;

-- Adliye grubu (300-399): adliyede TUTULAN paralar
--  301: harcama olarak yatirilan, geri donmeyen tutarlar
--  302: teminat olarak yatirilan, sonradan geri alinabilen tutarlar
INSERT INTO "cari_hesaplar" ("id","no","ad","paraHesabiMi","masrafHesabiMi","grup","tutulanHesapMi") VALUES
  ('cari-hesap-301', 301, 'Adliye Harcamaları (iade yok)', false, false, 'ADLIYE', true),
  ('cari-hesap-302', 302, 'Adliye Teminatları (iade edilebilir)', false, false, 'ADLIYE', true)
ON CONFLICT ("no") DO NOTHING;
