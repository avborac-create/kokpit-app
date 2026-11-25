-- Gelen odeme kaydina tamamlanma bicimi (TEYIT / DOSYADA_KAYITLI). Yalnizca yeni sutun ekler; mevcut kayitlar TEYIT kalir.
ALTER TABLE "gelen_odeme_kayitlari" ADD COLUMN "tamamlanmaBicimi" TEXT NOT NULL DEFAULT 'TEYIT';
