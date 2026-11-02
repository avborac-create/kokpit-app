-- Islem gunlugu (geri al / yeniden uygula) - additive
CREATE TABLE "islem_gunlugu" (
  "id" TEXT NOT NULL,
  "kullaniciId" TEXT NOT NULL,
  "ozet" TEXT NOT NULL,
  "veri" JSONB NOT NULL,
  "durum" TEXT NOT NULL DEFAULT 'UYGULANDI',
  "neden" TEXT,
  "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "geriAlmaTarihi" TIMESTAMP(3),
  CONSTRAINT "islem_gunlugu_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "islem_gunlugu_kullaniciId_durum_olusturmaTarihi_idx" ON "islem_gunlugu"("kullaniciId", "durum", "olusturmaTarihi");
