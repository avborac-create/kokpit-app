-- Dosya durum kodu revizyonu: yeni varsayilan durumlar (Hazirlaniyor, Yeni Esas x2,
-- Diger Durum), istinaf/Yargitay gidis sayisi ve kullanicinin yazdigi "diger durum"
-- adi. Yalnizca ekleme; mevcut dosya kayitlarina dokunulmaz.
ALTER TABLE "dava_dosyalari" ADD COLUMN "durumGidisSayisi" INTEGER;
ALTER TABLE "dava_dosyalari" ADD COLUMN "durumDiger" TEXT;

INSERT INTO "secenek_degerleri" ("id", "listeId", "kod", "etiket", "siraNo", "aktifMi")
VALUES
  (md5('dosya_durum_kodu_hazirlaniyor'), md5('liste_dosya_durum_kodu'), 'hazirlaniyor', 'Hazırlanıyor', 0, true),
  (md5('dosya_durum_kodu_yeni_esas_yargitay_bozmasi'), md5('liste_dosya_durum_kodu'), 'yeni_esas_yargitay_bozmasi', 'Yeni Esas (Yargıtay Bozması)', 5, true),
  (md5('dosya_durum_kodu_yeni_esas_istinaf_kaldirmasi'), md5('liste_dosya_durum_kodu'), 'yeni_esas_istinaf_kaldirmasi', 'Yeni Esas (İstinaf Kaldırması)', 6, true),
  (md5('dosya_durum_kodu_diger'), md5('liste_dosya_durum_kodu'), 'diger', 'Diğer Durum', 99, true)
ON CONFLICT DO NOTHING;

UPDATE "secenek_degerleri" SET "siraNo" = 1 WHERE "id" = md5('dosya_durum_kodu_derdest');
UPDATE "secenek_degerleri" SET "siraNo" = 2 WHERE "id" = md5('dosya_durum_kodu_karara_cikmis');
UPDATE "secenek_degerleri" SET "siraNo" = 3 WHERE "id" = md5('dosya_durum_kodu_istinafta');
UPDATE "secenek_degerleri" SET "siraNo" = 4 WHERE "id" = md5('dosya_durum_kodu_yargitayda');
UPDATE "secenek_degerleri" SET "siraNo" = 7 WHERE "id" = md5('dosya_durum_kodu_kesinlesme_serhi');
UPDATE "secenek_degerleri" SET "siraNo" = 8 WHERE "id" = md5('dosya_durum_kodu_yargilamanin_yenilenmesi');
