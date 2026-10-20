CREATE TABLE "muvekkil_anlasmalari" (
    "id" TEXT NOT NULL,
    "musteriId" TEXT NOT NULL,
    "dosyaId" TEXT,
    "hizmetBedeli" DECIMAL(14,2),
    "kdvDahilMi" BOOLEAN,
    "kdvOrani" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "odemeSekliId" TEXT,
    "odemePlani" TEXT,
    "basariPrimi" TEXT,
    "masrafSorumlusuId" TEXT,
    "anlasmaTarihi" TIMESTAMP(3),
    "belgeReferansi" TEXT,
    "notlar" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "muvekkil_anlasmalari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "muvekkil_anlasmalari_musteriId_idx" ON "muvekkil_anlasmalari"("musteriId");
CREATE INDEX "muvekkil_anlasmalari_dosyaId_idx" ON "muvekkil_anlasmalari"("dosyaId");

-- AddForeignKey
ALTER TABLE "muvekkil_anlasmalari" ADD CONSTRAINT "muvekkil_anlasmalari_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "musteriler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "muvekkil_anlasmalari" ADD CONSTRAINT "muvekkil_anlasmalari_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "muvekkil_anlasmalari" ADD CONSTRAINT "muvekkil_anlasmalari_odemeSekliId_fkey" FOREIGN KEY ("odemeSekliId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "muvekkil_anlasmalari" ADD CONSTRAINT "muvekkil_anlasmalari_masrafSorumlusuId_fkey" FOREIGN KEY ("masrafSorumlusuId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Anlasma listeleri (admin yerinde duzenleyebilir / yeni deger ekleyebilir)
INSERT INTO "secenek_listeleri" ("id","anahtar","ad") VALUES
  ('liste-anlasma-odeme-sekli', 'anlasma_odeme_sekli', 'Anlaşma Ödeme Şekli'),
  ('liste-anlasma-masraf-sorumlusu', 'anlasma_masraf_sorumlusu', 'Anlaşma Masraf Sorumlusu')
ON CONFLICT ("anahtar") DO NOTHING;

INSERT INTO "secenek_degerleri" ("id","listeId","kod","etiket","siraNo","aktifMi")
SELECT v."id", l."id", v."kod", v."etiket", v."siraNo", true
FROM (VALUES
  ('anlasma-odeme-pesin',     'anlasma_odeme_sekli', 'pesin',          'Peşin',                         0),
  ('anlasma-odeme-taksitli',  'anlasma_odeme_sekli', 'taksitli',       'Taksitli',                      1),
  ('anlasma-odeme-basari',    'anlasma_odeme_sekli', 'basariya_bagli', 'Başarıya bağlı',                2),
  ('anlasma-odeme-karma',     'anlasma_odeme_sekli', 'karma',          'Karma (peşin + başarı primi)',  3),
  ('anlasma-masraf-muvekkil', 'anlasma_masraf_sorumlusu', 'muvekkil',       'Müvekkil',                      0),
  ('anlasma-masraf-buro',     'anlasma_masraf_sorumlusu', 'buro',           'Büro',                          1),
  ('anlasma-masraf-karsi',    'anlasma_masraf_sorumlusu', 'karsi_taraftan', 'Karşı taraftan tahsil edilecek', 2),
  ('anlasma-masraf-paylasim', 'anlasma_masraf_sorumlusu', 'paylasimli',     'Paylaşımlı',                    3)
) AS v("id","liste","kod","etiket","siraNo")
JOIN "secenek_listeleri" l ON l."anahtar" = v."liste"
ON CONFLICT ("listeId","kod") DO NOTHING;
