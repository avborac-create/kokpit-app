-- Muvekkilden para isteme takibi: finans yetkilisi, bildirim tercihleri, istendi/geldi bilgileri (additive)
ALTER TABLE "kullanicilar" ADD COLUMN "finansYetkilisiMi" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bildirimKapali" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "kullanicilar" SET "finansYetkilisiMi" = true WHERE "adSoyad" = 'Ebru Sınmaz';

ALTER TABLE "hesap_ozeti_kayitlari"
  ADD COLUMN "istenmeTarihi" DATE,
  ADD COLUMN "sorumluId" TEXT,
  ADD COLUMN "konu" TEXT,
  ADD COLUMN "geldiMi" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "geldiTarihi" DATE,
  ADD COLUMN "bankaHesabi" TEXT,
  ADD COLUMN "teyitEdenId" TEXT,
  ADD COLUMN "teyitZamani" TIMESTAMP(3);
