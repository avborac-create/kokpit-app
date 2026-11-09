-- Kunye: "Dosya Durum Kodu" (Derdest, Karara Cikmis, Istinafta, Yargitay'da,
-- Kesinlesme Serhi, Yargilamanin Yenilenmesi...). Duzenlenebilir secenek
-- listesi; mevcut kayitlara dokunulmaz (bos kalir, tahmin/backfill yok).
ALTER TABLE "dava_dosyalari" ADD COLUMN "durumKoduId" TEXT;
CREATE INDEX "dava_dosyalari_durumKoduId_idx" ON "dava_dosyalari"("durumKoduId");
ALTER TABLE "dava_dosyalari" ADD CONSTRAINT "dava_dosyalari_durumKoduId_fkey" FOREIGN KEY ("durumKoduId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "secenek_listeleri" ("id", "anahtar", "ad")
VALUES (md5('liste_dosya_durum_kodu'), 'dosya_durum_kodu', 'Dosya Durum Kodu');

INSERT INTO "secenek_degerleri" ("id", "listeId", "kod", "etiket", "siraNo", "aktifMi")
VALUES
  (md5('dosya_durum_kodu_derdest'), md5('liste_dosya_durum_kodu'), 'derdest', 'Derdest', 0, true),
  (md5('dosya_durum_kodu_karara_cikmis'), md5('liste_dosya_durum_kodu'), 'karara_cikmis', 'Karara Çıkmış', 1, true),
  (md5('dosya_durum_kodu_istinafta'), md5('liste_dosya_durum_kodu'), 'istinafta', 'İstinafta', 2, true),
  (md5('dosya_durum_kodu_yargitayda'), md5('liste_dosya_durum_kodu'), 'yargitayda', 'Yargıtay''da', 3, true),
  (md5('dosya_durum_kodu_kesinlesme_serhi'), md5('liste_dosya_durum_kodu'), 'kesinlesme_serhi', 'Kesinleşme Şerhi', 4, true),
  (md5('dosya_durum_kodu_yargilamanin_yenilenmesi'), md5('liste_dosya_durum_kodu'), 'yargilamanin_yenilenmesi', 'Yargılamanın Yenilenmesi', 5, true);
