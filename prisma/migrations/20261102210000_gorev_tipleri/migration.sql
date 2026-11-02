-- Gorev tipleri: zaman baskisi, periyot, donemsel tetikleyici, yargi turu (additive)
CREATE TABLE "gorev_yargi_turleri" (
  "id" TEXT NOT NULL,
  "ad" TEXT NOT NULL,
  "sira" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "gorev_yargi_turleri_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gorev_yargi_turleri_ad_key" ON "gorev_yargi_turleri"("ad");

ALTER TABLE "isler" ADD COLUMN "periyot" TEXT NOT NULL DEFAULT 'HAFTA',
  ADD COLUMN "tetikleyici" TEXT,
  ADD COLUMN "zamanBaskisi" TEXT,
  ADD COLUMN "yargiTuruId" TEXT;
ALTER TABLE "isler" ADD CONSTRAINT "isler_yargiTuruId_fkey" FOREIGN KEY ("yargiTuruId") REFERENCES "gorev_yargi_turleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "gorev_yargi_turleri" ("id","ad","sira") VALUES
 ('yt_ihtiyati_icra','İhtiyati İcra İşleri',1),
 ('yt_normal_icra','Normal Takip İcra İşleri',2),
 ('yt_sigorta_yargi','Sigorta Yargı',3),
 ('yt_sigorta_tahkim','Sigorta Tahkim Başvuru',4),
 ('yt_idari','İdari İş',5);
