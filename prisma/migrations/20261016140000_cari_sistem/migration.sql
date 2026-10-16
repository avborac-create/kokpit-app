-- CreateEnum
CREATE TYPE "CariYon" AS ENUM ('BORC', 'ALACAK');

-- CreateTable
CREATE TABLE "cari_hesaplar" (
    "id" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "ad" TEXT NOT NULL,
    "paraHesabiMi" BOOLEAN NOT NULL DEFAULT false,
    "masrafHesabiMi" BOOLEAN NOT NULL DEFAULT false,
    "eskiKod" TEXT,
    "aktifMi" BOOLEAN NOT NULL DEFAULT true,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cari_hesaplar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cari_hareketleri" (
    "id" TEXT NOT NULL,
    "musteriId" TEXT NOT NULL,
    "dosyaId" TEXT,
    "hesapId" TEXT NOT NULL,
    "yon" "CariYon" NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "aciklama" TEXT,
    "virmanId" TEXT,
    "havuzKaynakli" BOOLEAN NOT NULL DEFAULT false,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cari_hareketleri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cari_hesaplar_no_key" ON "cari_hesaplar"("no");

-- CreateIndex
CREATE UNIQUE INDEX "cari_hesaplar_eskiKod_key" ON "cari_hesaplar"("eskiKod");

-- CreateIndex
CREATE INDEX "cari_hareketleri_musteriId_idx" ON "cari_hareketleri"("musteriId");

-- CreateIndex
CREATE INDEX "cari_hareketleri_dosyaId_idx" ON "cari_hareketleri"("dosyaId");

-- CreateIndex
CREATE INDEX "cari_hareketleri_hesapId_idx" ON "cari_hareketleri"("hesapId");

-- CreateIndex
CREATE INDEX "cari_hareketleri_virmanId_idx" ON "cari_hareketleri"("virmanId");

-- AddForeignKey
ALTER TABLE "cari_hareketleri" ADD CONSTRAINT "cari_hareketleri_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "musteriler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cari_hareketleri" ADD CONSTRAINT "cari_hareketleri_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cari_hareketleri" ADD CONSTRAINT "cari_hareketleri_hesapId_fkey" FOREIGN KEY ("hesapId") REFERENCES "cari_hesaplar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Baslangic hesaplari (admin sonradan ekleyip silebilir)
INSERT INTO "cari_hesaplar" ("id","no","ad","paraHesabiMi","masrafHesabiMi","eskiKod") VALUES
  ('cari-hesap-100', 100, 'Para Trafiği',  true,  false, NULL),
  ('cari-hesap-101', 101, 'Akdi Vekalet',  false, false, 'akdi_vekalet_hesabi'),
  ('cari-hesap-102', 102, 'Harcama',       false, true,  'masraf_hesabi'),
  ('cari-hesap-103', 103, 'Bloke Para',    false, false, 'bloke_paralar'),
  ('cari-hesap-104', 104, 'Ticari Hesap',  false, false, 'ticari_hesap'),
  ('cari-hesap-105', 105, 'Emanet Hesabı', false, false, 'emanet_hesabi'),
  ('cari-hesap-106', 106, 'Karşı Vekalet', false, false, 'karsi_vekalet'),
  ('cari-hesap-107', 107, 'Harç Hesabı',   false, false, 'harc_hesabi');

-- Onceki surumde dosya icinde girilmis para girisleri yeni defter yapisina tasinir:
-- muvekkil = dosyanin ilk muvekkili; Para Trafigi'ne ALACAK, dosyaya etiketli.
INSERT INTO "cari_hareketleri" ("id","musteriId","dosyaId","hesapId","yon","tarih","tutar","aciklama")
SELECT 'tasinan-' || g."id", dm."musteriId", g."dosyaId", 'cari-hesap-100', 'ALACAK', g."tarih", g."tutar", COALESCE(g."aciklama", 'GELEN ÖDEME')
FROM "dosya_para_girisleri" g
JOIN LATERAL (
  SELECT "musteriId" FROM "dosya_muvekkilleri" WHERE "dosyaId" = g."dosyaId" ORDER BY "musteriId" LIMIT 1
) dm ON true;

-- Onceki surumde girilmis cari borclar (tahakkuk): ilgili hesaba BORC.
INSERT INTO "cari_hareketleri" ("id","musteriId","dosyaId","hesapId","yon","tarih","tutar","aciklama")
SELECT 'tasinan-' || t."id", dm."musteriId", t."dosyaId", ch."id", 'BORC', t."tarih", t."tutar", t."dayanak"
FROM "dosya_cari_tahakkuklari" t
JOIN "secenek_degerleri" sd ON sd."id" = t."cariKodId"
JOIN "cari_hesaplar" ch ON ch."eskiKod" = sd."kod"
JOIN LATERAL (
  SELECT "musteriId" FROM "dosya_muvekkilleri" WHERE "dosyaId" = t."dosyaId" ORDER BY "musteriId" LIMIT 1
) dm ON true;
