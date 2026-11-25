-- CMK dosyasina muvekkil TCKN alani (istege bagli). Yalnizca ekleme; mevcut kayitlara dokunmaz.
ALTER TABLE "cmk_dosyalari" ADD COLUMN "tckn" TEXT;
