-- Dosya durum turleri: Yeni Esas ile kapanan onceki turlarin gecmisi. Yalnizca ekleme.
ALTER TABLE "dava_dosyalari" ADD COLUMN "durumTurGecmisi" JSONB;
