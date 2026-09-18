-- Veri + sema migrasyonu: "Esas Icra Dosyasi" / "Talimat Dosyasi" / "Icra
-- Ceza Davasi" ayri "Dosya Turu" secenekleri olmaktan cikip, DavaDosyasi'ya
-- eklenen iki yeni, bagimsiz siniflandirma boyutuna tasindi:
--   - icraAltTuruId (Esas/Talimat) - SADECE tur=icra_dosyasi anlamli
--   - yargiKoluId (Hukuk/Ceza/Idari) - SADECE tur=dava_dosyasi anlamli
-- Boylece "hangi ASAMADAYIZ" (Dosya Turu) ile "icrada hangi ALT TURDEYIZ"
-- ve "davada hangi YARGI KOLUNDAYIZ" sorulari birbirinden ayrisir - bkz.
-- ARCHITECTURE.md.

-- AlterTable
ALTER TABLE "dava_dosyalari" ADD COLUMN "icraAltTuruId" TEXT;
ALTER TABLE "dava_dosyalari" ADD COLUMN "yargiKoluId" TEXT;

-- CreateIndex
CREATE INDEX "dava_dosyalari_icraAltTuruId_idx" ON "dava_dosyalari"("icraAltTuruId");
CREATE INDEX "dava_dosyalari_yargiKoluId_idx" ON "dava_dosyalari"("yargiKoluId");

-- AddForeignKey
ALTER TABLE "dava_dosyalari" ADD CONSTRAINT "dava_dosyalari_icraAltTuruId_fkey" FOREIGN KEY ("icraAltTuruId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dava_dosyalari" ADD CONSTRAINT "dava_dosyalari_yargiKoluId_fkey" FOREIGN KEY ("yargiKoluId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Yeni secenek listeleri: "icra_dosyasi_alt_turu" ve "yargi_kolu". Deger
-- id'leri deterministik md5 ile uretildi (bkz.
-- 20260913210000_dosya_karsi_taraflari_coka_cok emsali) - hemen asagidaki
-- veri geri-doldurma (backfill) adimlari bu id'lere ihtiyac duyuyor;
-- "npm run build" sirasinda migrate'ten SONRA calisan prisma/seed.ts ayni
-- anahtar/kod degerleriyle bu satirlari zaten bulup (upsert "sadece
-- eksikse olustur" oldugu icin) dokunmadan gececek.
INSERT INTO "secenek_listeleri" ("id", "anahtar", "ad")
VALUES (md5('liste_icra_dosyasi_alt_turu'), 'icra_dosyasi_alt_turu', 'İcra Dosyası Alt Türü');

INSERT INTO "secenek_degerleri" ("id", "listeId", "kod", "etiket", "siraNo", "aktifMi")
VALUES
  (md5('icra_alt_turu_esas'), md5('liste_icra_dosyasi_alt_turu'), 'esas', 'Esas İcra Dosyası', 0, true),
  (md5('icra_alt_turu_talimat'), md5('liste_icra_dosyasi_alt_turu'), 'talimat', 'Talimat Dosyası', 1, true);

INSERT INTO "secenek_listeleri" ("id", "anahtar", "ad")
VALUES (md5('liste_yargi_kolu'), 'yargi_kolu', 'Yargı Kolu');

INSERT INTO "secenek_degerleri" ("id", "listeId", "kod", "etiket", "siraNo", "aktifMi")
VALUES
  (md5('yargi_kolu_hukuk'), md5('liste_yargi_kolu'), 'hukuk', 'Hukuk', 0, true),
  (md5('yargi_kolu_ceza'), md5('liste_yargi_kolu'), 'ceza', 'Ceza', 1, true),
  (md5('yargi_kolu_idari'), md5('liste_yargi_kolu'), 'idari', 'İdari', 2, true);

-- "Esas Icra Dosyasi" turunu AYNI satirda (ayni id, mevcut turId FK'lari
-- BOZULMADAN) "Icra Dosyasi" olarak yeniden adlandir - boylece su an
-- turId = esas_icra_dosyasi olan HER dava_dosyalari satiri otomatik olarak
-- yeni "icra_dosyasi" turune gecmis olur, tek tek guncellemeye gerek kalmaz.
UPDATE "secenek_degerleri"
SET "kod" = 'icra_dosyasi', "etiket" = 'İcra Dosyası'
WHERE "kod" = 'esas_icra_dosyasi'
  AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'dosya_turu');

-- Yukaridaki yeniden adlandirmadan SONRA, halen turId = (yeniden adlandirilan
-- eski esas_icra_dosyasi) olan satirlar orijinal ESAS kayitlaridir - alt
-- turlerini Esas olarak isaretle. (Talimat satirlari asagida ayrica ele
-- alinir, bu noktada henuz kendi eski turId'lerini tasiyorlar.)
UPDATE "dava_dosyalari"
SET "icraAltTuruId" = (
  SELECT "id" FROM "secenek_degerleri"
  WHERE "kod" = 'esas' AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'icra_dosyasi_alt_turu')
)
WHERE "turId" = (
  SELECT "id" FROM "secenek_degerleri"
  WHERE "kod" = 'icra_dosyasi' AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'dosya_turu')
);

-- Eskiden turId = talimat_dosyasi olan satirlari yeni "icra_dosyasi"
-- turune tasi ve alt turlerini Talimat olarak isaretle.
UPDATE "dava_dosyalari"
SET
  "turId" = (
    SELECT "id" FROM "secenek_degerleri"
    WHERE "kod" = 'icra_dosyasi' AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'dosya_turu')
  ),
  "icraAltTuruId" = (
    SELECT "id" FROM "secenek_degerleri"
    WHERE "kod" = 'talimat' AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'icra_dosyasi_alt_turu')
  )
WHERE "turId" = (
  SELECT "id" FROM "secenek_degerleri"
  WHERE "kod" = 'talimat_dosyasi' AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'dosya_turu')
);

-- Eskiden turId = icra_ceza_davasi olan satirlari "dava_dosyasi" turune
-- tasi ve yargi kolunu Ceza olarak isaretle.
UPDATE "dava_dosyalari"
SET
  "turId" = (
    SELECT "id" FROM "secenek_degerleri"
    WHERE "kod" = 'dava_dosyasi' AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'dosya_turu')
  ),
  "yargiKoluId" = (
    SELECT "id" FROM "secenek_degerleri"
    WHERE "kod" = 'ceza' AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'yargi_kolu')
  )
WHERE "turId" = (
  SELECT "id" FROM "secenek_degerleri"
  WHERE "kod" = 'icra_ceza_davasi' AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'dosya_turu')
);

-- Artik hicbir dava_dosyalari satirinin baglanmadigi eski "talimat_dosyasi"
-- ve "icra_ceza_davasi" secenek degerlerini SILMEK yerine (referans/denetim
-- gecmisi icin) pasife al ve etiketini "(eski)" ile isaretle - bkz.
-- prisma/seed.ts "para_trafigi_tipi" emsali.
UPDATE "secenek_degerleri"
SET "etiket" = 'Talimat Dosyası (eski - artık İcra Dosyası + Talimat alt türü)', "aktifMi" = false
WHERE "kod" = 'talimat_dosyasi'
  AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'dosya_turu');

UPDATE "secenek_degerleri"
SET "etiket" = 'İcra Ceza Davası (eski - artık Dava Dosyası + Ceza yargı kolu)', "aktifMi" = false
WHERE "kod" = 'icra_ceza_davasi'
  AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'dosya_turu');

-- "Dava Dosyasi (Hukuk/Ceza)" etiketi artik yanlis izlenim veriyor (Ceza
-- ayrimi artik Yargi Kolu alaninda) - sadelestir.
UPDATE "secenek_degerleri"
SET "etiket" = 'Dava Dosyası'
WHERE "kod" = 'dava_dosyasi'
  AND "listeId" = (SELECT "id" FROM "secenek_listeleri" WHERE "anahtar" = 'dosya_turu');
