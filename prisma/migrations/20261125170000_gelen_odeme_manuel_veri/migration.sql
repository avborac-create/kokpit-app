-- Gelen odeme kaydina "manuel veri girilmis" isareti. Yalnizca yeni sutun ekler; mevcut kayitlara dokunmaz.
ALTER TABLE "gelen_odeme_kayitlari" ADD COLUMN "manuelVeri" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "gelen_odeme_kayitlari" ADD COLUMN "manuelVeriIsaretleyenId" TEXT;
ALTER TABLE "gelen_odeme_kayitlari" ADD COLUMN "manuelVeriZamani" TIMESTAMP(3);
