-- CreateEnum
CREATE TYPE "MuvekkilSifati" AS ENUM ('ALACAKLI', 'BORCLU');

-- AlterTable
ALTER TABLE "dava_dosyalari" ADD COLUMN     "muvekkilSifati" "MuvekkilSifati" NOT NULL DEFAULT 'ALACAKLI';

-- Mevcut kayitlarda sifat serbest metinde ("Borclu Icra Dosyasi") yazilmisti.
UPDATE "dava_dosyalari" SET "muvekkilSifati" = 'BORCLU' WHERE "konu" ILIKE 'Borçlu%' OR "konu" ILIKE 'Borclu%';
