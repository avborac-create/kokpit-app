-- AlterTable
ALTER TABLE "dava_dosyalari" ADD COLUMN     "muvekkilSifatiId" TEXT;

-- CreateIndex
CREATE INDEX "dava_dosyalari_muvekkilSifatiId_idx" ON "dava_dosyalari"("muvekkilSifatiId");

-- AddForeignKey
ALTER TABLE "dava_dosyalari" ADD CONSTRAINT "dava_dosyalari_muvekkilSifatiId_fkey" FOREIGN KEY ("muvekkilSifatiId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Muvekkil Sifati listesi (admin dosya formundan yerinde duzenleyebilir)
INSERT INTO "secenek_listeleri" ("id","anahtar","ad")
VALUES ('liste-muvekkil-sifati', 'muvekkil_sifati', 'Müvekkil Sıfatı')
ON CONFLICT ("anahtar") DO NOTHING;

INSERT INTO "secenek_degerleri" ("id","listeId","kod","etiket","siraNo","aktifMi")
SELECT v."id", l."id", v."kod", v."etiket", v."siraNo", true
FROM (VALUES
  ('sifat-alacakli', 'alacakli', 'Alacaklı', 0),
  ('sifat-borclu',   'borclu',   'Borçlu',   1),
  ('sifat-davaci',   'davaci',   'Davacı',   2),
  ('sifat-davali',   'davali',   'Davalı',   3),
  ('sifat-3-kisi',   '3_kisi',   '3. kişi',  4)
) AS v("id","kod","etiket","siraNo")
JOIN "secenek_listeleri" l ON l."anahtar" = 'muvekkil_sifati'
ON CONFLICT ("listeId","kod") DO NOTHING;

-- Daha once "Diger" + serbest metin girilmis sifatlar listeye ayri deger olarak tasinir.
INSERT INTO "secenek_degerleri" ("id","listeId","kod","etiket","siraNo","aktifMi")
SELECT 'sifat-eski-' || md5(t."metin"), l."id", 'eski_' || md5(t."metin"), t."metin", 10, true
FROM (
  SELECT DISTINCT trim("muvekkilSifatiDiger") AS "metin"
  FROM "dava_dosyalari"
  WHERE "muvekkilSifati" = 'DIGER' AND "muvekkilSifatiDiger" IS NOT NULL AND trim("muvekkilSifatiDiger") <> ''
) t
JOIN "secenek_listeleri" l ON l."anahtar" = 'muvekkil_sifati'
ON CONFLICT ("listeId","kod") DO NOTHING;

-- Mevcut dosyalar: enum -> liste degeri
UPDATE "dava_dosyalari" SET "muvekkilSifatiId" = 'sifat-alacakli' WHERE "muvekkilSifati" = 'ALACAKLI';
UPDATE "dava_dosyalari" SET "muvekkilSifatiId" = 'sifat-borclu'   WHERE "muvekkilSifati" = 'BORCLU';
UPDATE "dava_dosyalari" SET "muvekkilSifatiId" = 'sifat-3-kisi'   WHERE "muvekkilSifati" = 'DIGER';
UPDATE "dava_dosyalari"
SET "muvekkilSifatiId" = 'sifat-eski-' || md5(trim("muvekkilSifatiDiger"))
WHERE "muvekkilSifati" = 'DIGER' AND "muvekkilSifatiDiger" IS NOT NULL AND trim("muvekkilSifatiDiger") <> '';
