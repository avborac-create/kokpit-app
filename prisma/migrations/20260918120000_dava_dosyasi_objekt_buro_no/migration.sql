-- AlterTable: DavaDosyasi -> eski "Objekt" yaziliminin dosya/buro numarasi
-- (opsiyonel, referans amacli) - bkz. Hukuk Dosyasi sadelestirmesi.
ALTER TABLE "dava_dosyalari" ADD COLUMN "objektBuroNo" TEXT;
