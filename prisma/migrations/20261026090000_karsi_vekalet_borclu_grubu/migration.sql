-- 106 Karsi Vekalet hesabi borclu (karsi taraf) iliskisi tasidigi icin BORCLU grubuna alinir.
-- Hesap kodu, id ve hareketler degismez; yalniz sekme grubu degisir (bakiye hesabi gruptan bagimsizdir).
UPDATE "cari_hesaplar" SET "grup" = 'BORCLU' WHERE "eskiKod" = 'karsi_vekalet';
