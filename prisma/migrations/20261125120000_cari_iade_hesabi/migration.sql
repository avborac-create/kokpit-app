-- 109 Iade Edilecek Tutarlar: muvekkile geri donecek fazla para icin hesap.
-- Yalnizca ekleme yapar (yeni sutun + yeni hesap satiri); mevcut kayitlara dokunmaz.
ALTER TABLE "cari_hesaplar" ADD COLUMN "iadeHesabiMi" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "cari_hesaplar" ("id","no","ad","paraHesabiMi","masrafHesabiMi","grup","tutulanHesapMi","iadeHesabiMi") VALUES
  ('cari-hesap-109', 109, 'İade Edilecek Tutarlar', false, false, 'MUVEKKIL', true, true)
ON CONFLICT ("no") DO NOTHING;
