-- Para Hesaplari (yalniz yeni tablolar + bos/nullable kolonlar; mevcut veriye dokunmaz)
CREATE TABLE "para_hesaplari" (
  "id" TEXT NOT NULL,
  "ad" TEXT NOT NULL,
  "tur" TEXT NOT NULL DEFAULT 'BURO',
  "sahipAdi" TEXT,
  "sahipId" TEXT,
  "iban" TEXT,
  "varsayilanMi" BOOLEAN NOT NULL DEFAULT false,
  "aktifMi" BOOLEAN NOT NULL DEFAULT true,
  "sira" INTEGER NOT NULL DEFAULT 0,
  "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "para_hesaplari_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "hesap_mahsuplari" (
  "id" TEXT NOT NULL,
  "hesapId" TEXT NOT NULL,
  "yon" TEXT NOT NULL,
  "tarih" TIMESTAMP(3) NOT NULL,
  "tutar" DECIMAL(14,2) NOT NULL,
  "aciklama" TEXT,
  "olusturanId" TEXT,
  "iptalZamani" TIMESTAMP(3),
  "iptalEdenId" TEXT,
  "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hesap_mahsuplari_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hesap_mahsuplari_hesapId_idx" ON "hesap_mahsuplari"("hesapId");
ALTER TABLE "hesap_mahsuplari" ADD CONSTRAINT "hesap_mahsuplari_hesapId_fkey" FOREIGN KEY ("hesapId") REFERENCES "para_hesaplari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dosya_masraflari" ADD COLUMN "hesapId" TEXT;
ALTER TABLE "gelen_odeme_kayitlari" ADD COLUMN "hesapId" TEXT;
ALTER TABLE "para_havuzu_girisleri" ADD COLUMN "hesapId" TEXT;

INSERT INTO "para_hesaplari" ("id","ad","tur","varsayilanMi","sira") VALUES
('hesap-buro-banka','Büro Banka Hesabı','BURO',true,1),
('hesap-buro-nakit','Büro Nakit Kasası','NAKIT',false,2);

INSERT INTO "gelistirmeler" ("id","baslik","aciklama","modul","akis","olgunluk","yayinTarihi","guncellemeTarihi") VALUES
('gel-para-hesaplari','Para hesapları (büro / nakit / sigortalı avukat) ve mahsup','Her para girişi-çıkışı bir hesaba bağlanır; kişisel hesaptan çıkan masraf ya da kişisel hesaba gelen para büro ile hesap sahibi arasında alacak/borç doğurur, mahsupla kapanır','Finans','YAYINDA','PROTOTIP',NOW(),NOW());
