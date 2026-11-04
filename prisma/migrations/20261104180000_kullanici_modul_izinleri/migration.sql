-- Kullanici bazli modul izni (additive): Yonetici disindaki kullaniciya Finans gibi moduller ayrica acilabilir
ALTER TABLE "kullanicilar" ADD COLUMN "modulIzinleri" TEXT[] DEFAULT ARRAY[]::TEXT[];
