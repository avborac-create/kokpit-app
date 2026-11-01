-- Is turleri (parca / surec / operasyonel) + operasyon kayitlari.
ALTER TABLE "isler" ADD COLUMN "tur" TEXT NOT NULL DEFAULT 'PARCA';
ALTER TABLE "isler" ADD COLUMN "haftalikHedef" INTEGER;
ALTER TABLE "isler" ADD COLUMN "kaynak" TEXT;
CREATE INDEX "isler_tur_idx" ON "isler"("tur");
CREATE INDEX "isler_kaynak_idx" ON "isler"("kaynak");

CREATE TABLE "is_operasyon_kayitlari" (
    "id" TEXT NOT NULL,
    "isId" TEXT NOT NULL,
    "yapanId" TEXT,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "is_operasyon_kayitlari_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "is_operasyon_kayitlari_isId_tarih_idx" ON "is_operasyon_kayitlari"("isId", "tarih");
ALTER TABLE "is_operasyon_kayitlari" ADD CONSTRAINT "is_operasyon_kayitlari_isId_fkey" FOREIGN KEY ("isId") REFERENCES "isler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Eski "Bekleyen Gorevler" kayitlari Parca gorev olarak ISLER'e KOPYALANIR (eskiler silinmez; tekrar calisirsa cogaltmaz).
INSERT INTO "isler" ("id", "baslik", "aciklama", "durum", "tur", "kaynak", "sorumluId", "olusturanId", "olusturmaTarihi", "guncellemeTarihi", "tamamlanmaTarihi")
SELECT 'bg_' || "id", "baslik", "aciklama",
       CASE WHEN "tamamlandiMi" THEN 'TAMAMLANDI' ELSE 'BASLATILMADI' END,
       'PARCA', "kaynak", "sorumluId", "olusturanId", "olusturmaTarihi", "olusturmaTarihi", "tamamlanmaTarihi"
FROM "bekleyen_gorevler"
ON CONFLICT ("id") DO NOTHING;
