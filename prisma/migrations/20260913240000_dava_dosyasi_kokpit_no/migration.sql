-- CreateSequence
CREATE SEQUENCE "dava_dosyalari_kayitno_seq";

-- AlterTable: once nullable ekle, mevcut satirlari olusturma sirasina gore
-- geriye donuk numaralandir, sonra NOT NULL + otomatik-artan varsayilan yap.
ALTER TABLE "dava_dosyalari" ADD COLUMN "kayitNo" INTEGER;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "olusturmaTarihi" ASC) AS rn
  FROM "dava_dosyalari"
)
UPDATE "dava_dosyalari" d
SET "kayitNo" = numbered.rn
FROM numbered
WHERE d.id = numbered.id;

SELECT setval('dava_dosyalari_kayitno_seq', COALESCE((SELECT MAX("kayitNo") FROM "dava_dosyalari"), 0) + 1, false);

ALTER TABLE "dava_dosyalari" ALTER COLUMN "kayitNo" SET NOT NULL;
ALTER TABLE "dava_dosyalari" ALTER COLUMN "kayitNo" SET DEFAULT nextval('dava_dosyalari_kayitno_seq');
ALTER SEQUENCE "dava_dosyalari_kayitno_seq" OWNED BY "dava_dosyalari"."kayitNo";

-- CreateIndex
CREATE UNIQUE INDEX "dava_dosyalari_kayitNo_key" ON "dava_dosyalari"("kayitNo");
