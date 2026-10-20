-- AlterTable
ALTER TABLE "cari_hareketleri" ADD COLUMN     "odemeYontemiId" TEXT;

-- CreateIndex
CREATE INDEX "cari_hareketleri_odemeYontemiId_idx" ON "cari_hareketleri"("odemeYontemiId");

-- AddForeignKey
ALTER TABLE "cari_hareketleri" ADD CONSTRAINT "cari_hareketleri_odemeYontemiId_fkey" FOREIGN KEY ("odemeYontemiId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Odeme Yontemi listesi (admin yerinde duzenleyebilir / yeni yontem ekleyebilir)
INSERT INTO "secenek_listeleri" ("id","anahtar","ad")
VALUES ('liste-odeme-yontemi', 'odeme_yontemi', 'Ödeme Yöntemi')
ON CONFLICT ("anahtar") DO NOTHING;

INSERT INTO "secenek_degerleri" ("id","listeId","kod","etiket","siraNo","aktifMi")
SELECT v."id", l."id", v."kod", v."etiket", v."siraNo", true
FROM (VALUES
  ('odeme-nakit', 'nakit', 'Nakit', 0),
  ('odeme-banka', 'banka', 'Banka', 1)
) AS v("id","kod","etiket","siraNo")
JOIN "secenek_listeleri" l ON l."anahtar" = 'odeme_yontemi'
ON CONFLICT ("listeId","kod") DO NOTHING;
