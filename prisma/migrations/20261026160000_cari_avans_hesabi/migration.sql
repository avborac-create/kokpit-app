-- Avans hesabi (108): muvekkilden avans istenirken borc yazilir, gelen odeme Para Trafigi'nden virmanla duser.
-- Yalnizca ekleme yapar; mevcut kayitlara dokunmaz.
INSERT INTO "cari_hesaplar" ("id","no","ad","paraHesabiMi","masrafHesabiMi","grup","tutulanHesapMi") VALUES
  ('cari-hesap-108', 108, 'Avans', false, false, 'MUVEKKIL', false)
ON CONFLICT ("no") DO NOTHING;
