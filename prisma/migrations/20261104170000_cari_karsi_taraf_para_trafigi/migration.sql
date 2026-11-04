-- 201 Para Trafigi (Karsi Taraf): musteri 100/101 Para Trafigi ile ayni yapida gercek bir para hesabi.
-- Yalnizca ekleme yapar; mevcut kayitlara dokunmaz (eski karsi taraf alacaklari oldugu gibi kalir).
INSERT INTO "cari_hesaplar" ("id","no","ad","paraHesabiMi","masrafHesabiMi","grup","tutulanHesapMi") VALUES
  ('cari-hesap-201', 201, 'Para Trafiği', true, false, 'BORCLU', false)
ON CONFLICT ("no") DO NOTHING;
