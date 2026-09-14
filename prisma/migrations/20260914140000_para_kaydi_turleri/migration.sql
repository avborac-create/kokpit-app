-- Veri (data) migrasyonu, sema degisikligi degildir.
--
-- Kullanicinin "Dosya Kumesi/Para Kaydi" yeniden yapilandirmasi kapsaminda
-- para_trafigi_tipi listesindeki 3 mevcut degerin etiketi, kullanicinin
-- istedigi yeni terminolojiyle eslesecek sekilde TEK SEFERLIK guncellenir
-- (kod'lar AYNI kaliyor - gecmis kayitlar etkilenmez, sadece gorunen
-- metin degisiyor). Ayni desen: 20260913170000_emanet_para_rename.
-- seed.ts bu satirlarin etiketine bir daha asla dokunmaz.
UPDATE "secenek_degerleri"
SET "etiket" = 'Masraf Yaptık'
WHERE "kod" = 'masraf'
  AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'para_trafigi_tipi');

UPDATE "secenek_degerleri"
SET "etiket" = 'Bloke Para Yatırdık'
WHERE "kod" = 'bloke_para'
  AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'para_trafigi_tipi');

UPDATE "secenek_degerleri"
SET "etiket" = 'Vekâlet Ücreti Ekledik'
WHERE "kod" = 'akdi_vekalet'
  AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'para_trafigi_tipi');
