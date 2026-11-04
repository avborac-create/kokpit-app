-- Haciz raporu, Kokpit'te kayitli olmayan bir dosya icin de girilebilsin.
ALTER TABLE "haciz_raporlari" ALTER COLUMN "davaDosyasiId" DROP NOT NULL;
ALTER TABLE "haciz_raporlari" ADD COLUMN "kokpitteOlmayanDosya" TEXT;
