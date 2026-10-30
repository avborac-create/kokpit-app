-- Ekip dogum gunleri (ana sayfa paneli) icin istege bagli tarih. Yalniz yeni, bos sutun; mevcut kayitlar degismez.
ALTER TABLE "kullanicilar" ADD COLUMN "dogumTarihi" DATE;
