-- Buro rolu (Avukat / Yonetici / Personel): uygulama rolunden ayri yeni sutun.
-- Mevcut kayitlarin rolu degismez; yeni sutun eski role bakilarak ilk kez doldurulur.
CREATE TYPE "buro_rolu" AS ENUM ('AVUKAT', 'YONETICI', 'PERSONEL');

ALTER TABLE "kullanicilar" ADD COLUMN "buroRolu" "buro_rolu" NOT NULL DEFAULT 'PERSONEL';

UPDATE "kullanicilar" SET "buroRolu" = 'AVUKAT' WHERE "rol" IN ('SORUMLU_AVUKAT', 'ORTAK');
UPDATE "kullanicilar" SET "buroRolu" = 'YONETICI' WHERE "rol" = 'YONETICI';
