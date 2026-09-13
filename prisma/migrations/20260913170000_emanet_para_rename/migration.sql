-- Veri (data) migrasyonu, sema degisikligi degildir.
--
-- Kok neden: prisma/seed.ts, "npm run build" (dolayisiyla her deploy)
-- sirasinda calisiyor ve o zamana kadar mevcut secenek_degerleri
-- satirlarinin etiket/siraNo/aktifMi alanlarini seed.ts'teki sabit
-- degerlerle EZIYORDU. Bu, Ayarlar > Secenek Listeleri panelinden
-- yapilan HER admin duzenlemesini bir sonraki deploy'da sessizce geri
-- aliyordu - panelin butun amacini bosa cikaran bir hataydi. Bu migration
-- tek seferlik gerekli duzeltmeyi (Aktarilacak Para (Emanet) -> Emanet
-- Para) uygularken, seed.ts artik mevcut satirlari asla guncellemeyecek
-- sekilde degistirildi (bkz. secenekListeleriniOlustur) - bundan sonra
-- panelden yapilan degisiklikler kalicidir.
UPDATE "secenek_degerleri"
SET "etiket" = 'Emanet Para'
WHERE "kod" = 'aktarilacak_para'
  AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'para_trafigi_tipi');
