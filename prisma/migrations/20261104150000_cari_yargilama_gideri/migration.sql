-- Yargilama Gideri (203): karsi tarafa (borcluya) yansitilan yargilama giderleri icin yeni hesap.
-- Yalnizca ekleme yapar; mevcut kayitlara dokunmaz.
INSERT INTO "cari_hesaplar" ("id","no","ad","paraHesabiMi","masrafHesabiMi","grup","tutulanHesapMi") VALUES
  ('cari-hesap-203', 203, 'Yargılama Gideri', false, false, 'BORCLU', false)
ON CONFLICT ("no") DO NOTHING;
