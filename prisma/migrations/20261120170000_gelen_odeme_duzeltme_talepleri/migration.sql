-- Teyitli gelen odeme duzeltme talepleri (yalniz yeni tablo; mevcut veriye dokunmaz)
CREATE TABLE "gelen_odeme_duzeltme_talepleri" (
  "id" TEXT NOT NULL,
  "kayitId" TEXT NOT NULL,
  "talepEdenId" TEXT,
  "eskiTutar" DECIMAL(14,2) NOT NULL,
  "eskiTarih" TIMESTAMP(3) NOT NULL,
  "eskiOdeyenAdi" TEXT,
  "eskiAciklama" TEXT,
  "yeniTutar" DECIMAL(14,2) NOT NULL,
  "yeniTarih" TIMESTAMP(3) NOT NULL,
  "yeniOdeyenAdi" TEXT,
  "yeniAciklama" TEXT,
  "gerekce" TEXT,
  "durum" TEXT NOT NULL DEFAULT 'BEKLIYOR',
  "kararVerenId" TEXT,
  "kararZamani" TIMESTAMP(3),
  "kararNotu" TEXT,
  "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gelen_odeme_duzeltme_talepleri_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "gelen_odeme_duzeltme_talepleri_kayitId_idx" ON "gelen_odeme_duzeltme_talepleri"("kayitId");
CREATE INDEX "gelen_odeme_duzeltme_talepleri_durum_idx" ON "gelen_odeme_duzeltme_talepleri"("durum");
