-- Hizli Veri Girisi > Para Trafigi Kaydet (yalniz yeni tablo; mevcut veriye dokunmaz)
CREATE TABLE "gelen_odeme_kayitlari" (
  "id" TEXT NOT NULL,
  "tarih" TIMESTAMP(3) NOT NULL,
  "tutar" DECIMAL(14,2) NOT NULL,
  "odeyenAdi" TEXT,
  "aciklama" TEXT,
  "belgeUrl" TEXT,
  "belgeAd" TEXT,
  "belgeTur" TEXT,
  "dosyaId" TEXT,
  "musteriId" TEXT,
  "durum" TEXT NOT NULL DEFAULT 'TEYIT_BEKLIYOR',
  "olusturanId" TEXT,
  "teyitEdenId" TEXT,
  "teyitZamani" TIMESTAMP(3),
  "teyitNotu" TEXT,
  "cariHareketId" TEXT,
  "havuzGirisiId" TEXT,
  "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gelen_odeme_kayitlari_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "gelen_odeme_kayitlari_durum_idx" ON "gelen_odeme_kayitlari"("durum");
CREATE INDEX "gelen_odeme_kayitlari_dosyaId_idx" ON "gelen_odeme_kayitlari"("dosyaId");
